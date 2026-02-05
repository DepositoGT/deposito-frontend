/**
 * Copyright (c) 2026 Diego Patzán. All Rights Reserved.
 * 
 * This source code is licensed under a Proprietary License.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited without express written permission.
 * 
 * For licensing inquiries: GitHub @dpatzan2
 */

/**
 * generateSupplierPDF - Generate PDF report for a supplier
 */
import jsPDF from 'jspdf'
import autoTable, { type jsPDFDocument } from 'jspdf-autotable'
import type { Supplier } from '@/types'

const formatCurrency = (value: number | string | null | undefined): string => {
  const num = typeof value === 'number' ? value : typeof value === 'string' ? parseFloat(value) || 0 : 0
  return `Q ${num.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export const generateSupplierPDF = (supplier: Supplier) => {
  const doc = new jsPDF() as jsPDFDocument
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 15
  let yPos = 20

  // Header
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text('INFORMACIÓN DEL PROVEEDOR', pageWidth / 2, yPos, { align: 'center' })

  yPos += 10
  doc.setFontSize(12)
  doc.setFont('helvetica', 'normal')
  doc.text(`Generado el ${new Date().toLocaleDateString('es-GT', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })}`, pageWidth / 2, yPos, { align: 'center' })

  yPos += 15

  // Información Básica
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('INFORMACIÓN BÁSICA', margin, yPos)
  yPos += 10

  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  
  // Columna izquierda
  const leftCol = margin
  const rightCol = pageWidth / 2 + 10
  let leftY = yPos
  let rightY = yPos

  // Nombre de la Empresa
  doc.setFont('helvetica', 'bold')
  doc.text('Nombre de la Empresa:', leftCol, leftY)
  doc.setFont('helvetica', 'normal')
  doc.text(supplier.name || 'N/A', leftCol + 50, leftY)
  leftY += 7

  // Persona de Contacto
  doc.setFont('helvetica', 'bold')
  doc.text('Persona de Contacto:', leftCol, leftY)
  doc.setFont('helvetica', 'normal')
  doc.text(supplier.contact || 'N/A', leftCol + 50, leftY)
  leftY += 7

  // Teléfono
  doc.setFont('helvetica', 'bold')
  doc.text('Teléfono:', leftCol, leftY)
  doc.setFont('helvetica', 'normal')
  doc.text(supplier.phone || 'N/A', leftCol + 50, leftY)
  leftY += 7

  // Email
  doc.setFont('helvetica', 'bold')
  doc.text('Email:', leftCol, leftY)
  doc.setFont('helvetica', 'normal')
  doc.text(supplier.email || 'N/A', leftCol + 50, leftY)
  leftY += 7

  // Dirección
  doc.setFont('helvetica', 'bold')
  doc.text('Dirección:', leftCol, leftY)
  doc.setFont('helvetica', 'normal')
  const addressLines = doc.splitTextToSize(supplier.address || 'N/A', pageWidth / 2 - margin - 10)
  doc.text(addressLines, leftCol + 50, leftY)
  leftY += addressLines.length * 5 + 3

  // Columna derecha
  // Categoría
  doc.setFont('helvetica', 'bold')
  doc.text('Categoría:', rightCol, rightY)
  doc.setFont('helvetica', 'normal')
  doc.text(String(supplier.category || 'N/A'), rightCol + 30, rightY)
  rightY += 7

  // Estado
  doc.setFont('helvetica', 'bold')
  doc.text('Estado:', rightCol, rightY)
  doc.setFont('helvetica', 'normal')
  const status = String(supplier.status || 'N/A')
  doc.text(status.charAt(0).toUpperCase() + status.slice(1), rightCol + 30, rightY)
  rightY += 7

  // Términos de Pago
  doc.setFont('helvetica', 'bold')
  doc.text('Términos de Pago:', rightCol, rightY)
  doc.setFont('helvetica', 'normal')
  doc.text(supplier.paymentTerms || 'N/A', rightCol + 30, rightY)
  rightY += 7

  // Último Pedido
  doc.setFont('helvetica', 'bold')
  doc.text('Último Pedido:', rightCol, rightY)
  doc.setFont('helvetica', 'normal')
  doc.text(supplier.lastOrder || 'N/A', rightCol + 30, rightY)

  // Usar la posición más baja de las dos columnas
  yPos = Math.max(leftY, rightY) + 15

  // Métricas
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('MÉTRICAS', margin, yPos)
  yPos += 10

  const metricsData = [
    ['Total de Productos', ((supplier.productsList?.length ?? supplier.products) ?? 0).toString()],
    ['Total de Compras', formatCurrency(supplier.totalPurchases ?? 0)],
    ['Último Pedido', supplier.lastOrder ?? 'N/A']
  ]

  autoTable(doc, {
    startY: yPos,
    head: [['Concepto', 'Valor']],
    body: metricsData,
    theme: 'grid',
    headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 100, fontStyle: 'bold' },
      1: { cellWidth: 'auto', halign: 'left' }
    }
  })

  yPos = doc.lastAutoTable.finalY + 15

  // Productos que Suministra
  if (supplier.productsList && supplier.productsList.length > 0) {
    if (yPos > 230) {
      doc.addPage()
      yPos = 20
    }

    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('PRODUCTOS QUE SUMINISTRA', margin, yPos)
    yPos += 10

    const productsData = supplier.productsList.map(product => [
      product.name || 'N/A',
      (product.stock || 0).toString(),
      formatCurrency(product.price || 0)
    ])

    autoTable(doc, {
      startY: yPos,
      head: [['Producto', 'Stock', 'Precio']],
      body: productsData,
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 'auto' },
        1: { cellWidth: 40, halign: 'center' },
        2: { cellWidth: 50, halign: 'right' }
      }
    })

    yPos = doc.lastAutoTable.finalY + 10
  } else {
    if (yPos > 240) {
      doc.addPage()
      yPos = 20
    }

    doc.setFontSize(12)
    doc.setFont('helvetica', 'normal')
    doc.text('No hay productos asociados a este proveedor.', margin, yPos)
    yPos += 10
  }

  // Footer con información adicional
  const pageHeight = doc.internal.pageSize.getHeight()
  if (yPos < pageHeight - 30) {
    yPos = pageHeight - 20
    doc.setFontSize(8)
    doc.setFont('helvetica', 'italic')
    doc.setTextColor(128, 128, 128)
    doc.text(
      `Reporte generado automáticamente - ${supplier.name}`,
      pageWidth / 2,
      yPos,
      { align: 'center' }
    )
  }

  // Save PDF
  const safeName = supplier.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()
  doc.save(`Proveedor_${safeName}_${new Date().toISOString().split('T')[0]}.pdf`)
}
