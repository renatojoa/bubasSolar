// backend/src/routes/reports.js
import PDFDocument from 'pdfkit'
import { getRangeProduction } from '../services/production.js'
import { getContractSavings } from '../services/savings.js'

export default async function reportsRoutes(fastify) {
  // GET /reports/pdf?contract_id=uuid&month=2026-06
  fastify.get('/pdf', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { contract_id, month } = request.query
    if (!contract_id || !month) {
      return reply.code(400).send({ error: 'contract_id and month required' })
    }

    // Validate month format (YYYY-MM)
    if (!/^\d{4}-\d{2}$/.test(month)) {
      return reply.code(400).send({ error: 'month must be in YYYY-MM format' })
    }

    // Verify ownership
    const { data: contract } = await request.supabase
      .from('contracts')
      .select('id, name, investment_brl, tariff_kwh, percentage, plant:plant_id(name, city, state)')
      .eq('id', contract_id)
      .eq('user_id', request.user.userId)
      .single()

    if (!contract) return reply.code(403).send({ error: 'Forbidden' })

    // Calculate date range for the month
    const from = `${month}-01`
    const lastDay = new Date(`${month}-01`)
    lastDay.setMonth(lastDay.getMonth() + 1)
    lastDay.setDate(0)
    const to = lastDay.toISOString().slice(0, 10)

    const [production, savings] = await Promise.all([
      getRangeProduction(contract_id, from, to),
      getContractSavings(contract_id),
    ])

    const totalMonthKwh = production.reduce((s, r) => s + r.energy_kwh, 0)
    const totalMonthBrl = Number((totalMonthKwh * contract.tariff_kwh).toFixed(2))
    const co2Month = Number((totalMonthKwh * 0.617).toFixed(1))

    reply.header('Content-Type', 'application/pdf')
    reply.header('Content-Disposition', `attachment; filename="relatorio-solar-${month}.pdf"`)

    const doc = new PDFDocument({ margin: 50, size: 'A4' })
    const chunks = []
    doc.on('data', (chunk) => chunks.push(chunk))

    // Build PDF content
    // Header
    doc.fontSize(22).font('Helvetica-Bold').text('Relatório de Geração Solar', { align: 'center' })
    doc.moveDown(0.5)
    doc.fontSize(12).font('Helvetica').text(`Período: ${month}`, { align: 'center' })
    doc.moveDown(1.5)

    // Contract info
    doc.fontSize(14).font('Helvetica-Bold').text('Dados do Contrato')
    doc.moveDown(0.3)
    doc.fontSize(11).font('Helvetica')
    doc.text(`Contrato: ${contract.name}`)
    doc.text(`Usina: ${contract.plant.name}`)
    if (contract.plant.city) doc.text(`Localização: ${contract.plant.city}${contract.plant.state ? ', ' + contract.plant.state : ''}`)
    doc.text(`Participação: ${contract.percentage}%`)
    doc.text(`Tarifa: R$ ${Number(contract.tariff_kwh).toFixed(4)}/kWh`)
    doc.moveDown(1)

    // Monthly summary
    doc.fontSize(14).font('Helvetica-Bold').text('Resumo do Mês')
    doc.moveDown(0.3)
    doc.fontSize(11).font('Helvetica')
    doc.text(`Energia gerada: ${totalMonthKwh.toFixed(2)} kWh`)
    doc.text(`Economia estimada: R$ ${totalMonthBrl.toFixed(2)}`)
    doc.text(`CO₂ evitado: ${co2Month} kg`)
    doc.moveDown(1)

    // Cumulative savings
    doc.fontSize(14).font('Helvetica-Bold').text('Acumulado Geral')
    doc.moveDown(0.3)
    doc.fontSize(11).font('Helvetica')
    doc.text(`Investimento total: R$ ${Number(savings.investment_brl).toFixed(2)}`)
    doc.text(`Total economizado: R$ ${savings.total_saved_brl.toFixed(2)}`)
    doc.text(`CO₂ total evitado: ${savings.co2_kg} kg`)
    doc.text(`Equivalente em árvores: ${savings.trees_equivalent}`)
    if (savings.estimated_payback_date) {
      doc.text(`Retorno estimado do investimento: ${savings.estimated_payback_date}`)
    }
    doc.moveDown(1)

    // Daily production table
    if (production.length > 0) {
      doc.fontSize(14).font('Helvetica-Bold').text('Geração Diária')
      doc.moveDown(0.3)
      doc.fontSize(10).font('Helvetica')
      for (const row of production) {
        doc.text(`${row.date}    ${row.energy_kwh.toFixed(3)} kWh    R$ ${(row.energy_kwh * contract.tariff_kwh).toFixed(2)}`)
      }
    }

    // Footer
    doc.moveDown(2)
    doc.fontSize(9).fillColor('grey').text(`Gerado em ${new Date().toLocaleDateString('pt-BR')}`, { align: 'center' })

    doc.end()

    // Wait for PDF to finish building then send
    await new Promise((resolve, reject) => {
      doc.on('end', resolve)
      doc.on('error', reject)
    })

    return reply.send(Buffer.concat(chunks))
  })
}
