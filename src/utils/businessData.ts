// Datos compartidos del negocio para mantener consistencia
export const getBusinessDataByPeriod = (period: string) => {
  const baseData = {
    "7days": {
      salesData: [
        { month: "L", ventas: 18000, costo: 12000 },
        { month: "M", ventas: 22000, costo: 15000 },
        { month: "M", ventas: 16000, costo: 11000 },
        { month: "J", ventas: 24000, costo: 17000 },
        { month: "V", ventas: 28000, costo: 19000 },
        { month: "S", ventas: 32000, costo: 21000 },
        { month: "D", ventas: 25000, costo: 16000 },
      ],
      totalSales: "Q 165,000",
      totalSalesNum: 165000,
      totalMargin: "28.2%",
      productsCount: 324,
      stockRotation: "6.1x",
      totalCosts: 111000
    },
    "30days": {
      salesData: [
        { month: "Ene", ventas: 45000, costo: 32000 },
        { month: "Feb", ventas: 52000, costo: 35000 },
        { month: "Mar", ventas: 48000, costo: 33000 },
        { month: "Abr", ventas: 61000, costo: 42000 },
        { month: "May", ventas: 55000, costo: 38000 },
        { month: "Jun", ventas: 67000, costo: 45000 },
      ],
      totalSales: "Q 328,000",
      totalSalesNum: 328000,
      totalMargin: "32.5%",
      productsCount: 1247,
      stockRotation: "4.2x",
      totalCosts: 225000
    },
    "90days": {
      salesData: [
        { month: "Oct", ventas: 58000, costo: 38000 },
        { month: "Nov", ventas: 62000, costo: 41000 },
        { month: "Dic", ventas: 75000, costo: 48000 },
        { month: "Ene", ventas: 45000, costo: 32000 },
        { month: "Feb", ventas: 52000, costo: 35000 },
        { month: "Mar", ventas: 48000, costo: 33000 },
      ],
      totalSales: "Q 340,000",
      totalSalesNum: 340000,
      totalMargin: "30.8%",
      productsCount: 3892,
      stockRotation: "3.8x",
      totalCosts: 227000
    },
    "year": {
      salesData: [
        { month: "Q1", ventas: 145000, costo: 100000 },
        { month: "Q2", ventas: 183000, costo: 125000 },
        { month: "Q3", ventas: 195000, costo: 132000 },
        { month: "Q4", ventas: 172000, costo: 115000 },
      ],
      totalSales: "Q 695,000",
      totalSalesNum: 695000,
      totalMargin: "31.7%",
      productsCount: 15248,
      stockRotation: "2.9x",
      totalCosts: 472000
    }
  };
  return baseData[period] || baseData["30days"];
};

export const topProducts = [
  { name: "Whisky Buchanans 18", category: "Whisky", ventas: 45, revenue: 38250, trend: "up" },
  { name: "Cerveza Gallo Pack 6", category: "Cervezas", ventas: 156, revenue: 7800, trend: "up" },
  { name: "Vino Tinto Reserva", category: "Vinos", ventas: 23, revenue: 6440, trend: "down" },
  { name: "Ron Zacapa 23", category: "Rones", ventas: 12, revenue: 11400, trend: "up" },
  { name: "Vodka Absolut", category: "Vodkas", ventas: 34, revenue: 10880, trend: "down" },
];

export const categoryPerformance = [
  { category: "Whisky", percentage: 35, color: "bg-liquor-gold" },
  { category: "Cervezas", percentage: 28, color: "bg-primary" },
  { category: "Vinos", percentage: 18, color: "bg-accent" },
  { category: "Rones", percentage: 12, color: "bg-liquor-burgundy" },
  { category: "Otros", percentage: 7, color: "bg-muted" },
];

export const inventoryData = [
  { product: "Whisky Buchanans 18 Años", stock: 15, minStock: 5, value: 850 },
  { product: "Vino Tinto Marqués de Cáceres Reserva", stock: 3, minStock: 10, value: 280 },
  { product: "Cerveza Gallo Pilsener Lata", stock: 120, minStock: 50, value: 8.50 },
  { product: "Ron Zacapa 23 Años", stock: 0, minStock: 3, value: 950 },
  { product: "Vodka Absolut Original", stock: 28, minStock: 8, value: 320 },
];

export const getReportStatsByPeriod = (period: string) => {
  const stats = {
    week: { totalReports: 12, monthlyReports: 3, automatedReports: 2, customReports: 1 },
    month: { totalReports: 156, monthlyReports: 24, automatedReports: 8, customReports: 12 },
    quarter: { totalReports: 468, monthlyReports: 72, automatedReports: 24, customReports: 36 },
    year: { totalReports: 1872, monthlyReports: 288, automatedReports: 96, customReports: 144 }
  };
  return stats[period] || stats.month;
};