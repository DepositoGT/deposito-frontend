import { useState } from "react";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import Dashboard from "@/components/Dashboard";
import ProductManagement from "@/components/ProductManagement";
import Analytics from "@/components/Analytics";
import SalesManagement from "@/components/SalesManagement";
import SuppliersManagement from "@/components/SuppliersManagement";
import ReportsManagement from "@/components/ReportsManagement";
import AlertsManagement from "@/components/AlertsManagement";
import ScannerManagement from "@/components/ScannerManagement";

const Index = () => {
  const [activeSection, setActiveSectionState] = useState("dashboard");

  // determine role from localStorage
  let storedUser = null;
  try { storedUser = typeof window !== 'undefined' ? localStorage.getItem('auth:user') : null; } catch (e) { storedUser = null; }
  let parsedUser = null;
  try { parsedUser = storedUser ? JSON.parse(storedUser) : null; } catch (e) { parsedUser = null; }
  const roleName = parsedUser?.role?.name ?? parsedUser?.role_name ?? undefined;
  const isSeller = typeof roleName === 'string' && ['seller', 'vendedor'].includes(roleName.toLowerCase());

  // wrapper to ensure sellers can only switch to 'sales'
  const setActiveSection = (section: string) => {
    if (isSeller && section !== 'sales') {
      setActiveSectionState('sales');
    } else {
      setActiveSectionState(section);
    }
  };

  const renderContent = () => {
  switch (activeSection) {
      case "dashboard":
    return isSeller ? <SalesManagement /> : <Dashboard onSectionChange={setActiveSection} />;
      case "products":
      case "inventory":
    return isSeller ? <SalesManagement /> : <ProductManagement />;
      case "analytics":
    return isSeller ? <SalesManagement /> : <Analytics />;
      case "sales":
        return <SalesManagement />;
      case "suppliers":
    return isSeller ? <SalesManagement /> : <SuppliersManagement />;
      case "reports":
    return isSeller ? <SalesManagement /> : <ReportsManagement />;
      case "alerts":
    return isSeller ? <SalesManagement /> : <AlertsManagement />;
      case "scanner":
    return isSeller ? <SalesManagement /> : <ScannerManagement />;
      default:
    return isSeller ? <SalesManagement /> : <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="flex">
        <Sidebar activeSection={activeSection} onSectionChange={setActiveSection} />
        <main className="flex-1 overflow-auto">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default Index;
