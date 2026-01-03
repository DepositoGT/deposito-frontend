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
import UserManagement from "@/components/UserManagement";
import { CatalogsManagement } from "@/components/CatalogsManagement";
import ReturnsManagement from "@/components/ReturnsManagement";
import CashClosureManagement from "@/components/CashClosureManagement";
import PromotionsManagement from "@/components/PromotionsManagement";

const Index = () => {
  const [activeSection, setActiveSectionState] = useState("dashboard");

  // determine role from localStorage
  let storedUser = null;
  try { storedUser = typeof window !== 'undefined' ? localStorage.getItem('auth:user') : null; } catch (e) { storedUser = null; }
  let parsedUser = null;
  try { parsedUser = storedUser ? JSON.parse(storedUser) : null; } catch (e) { parsedUser = null; }
  const roleName = parsedUser?.role?.name ?? parsedUser?.role_name ?? undefined;
  const isSeller = typeof roleName === 'string' && ['seller', 'vendedor'].includes(roleName.toLowerCase());

  // wrapper to ensure sellers can only switch to 'sales' and 'cash-closure'
  const setActiveSection = (section: string) => {
    if (isSeller && section !== 'sales' && section !== 'cash-closure') {
      setActiveSectionState('sales');
    } else {
      setActiveSectionState(section);
    }
  };

  const renderContent = () => {
    switch (activeSection) {
      case "dashboard":
        return isSeller ? <SalesManagement onSectionChange={setActiveSection} /> : <Dashboard onSectionChange={setActiveSection} />;
      case "products":
      case "inventory":
        return isSeller ? <SalesManagement onSectionChange={setActiveSection} /> : <ProductManagement />;
      case "analytics":
        return isSeller ? <SalesManagement onSectionChange={setActiveSection} /> : <Analytics />;
      case "sales":
        return <SalesManagement onSectionChange={setActiveSection} />;
      case "suppliers":
        return isSeller ? <SalesManagement onSectionChange={setActiveSection} /> : <SuppliersManagement />;
      case "reports":
        return isSeller ? <SalesManagement /> : <ReportsManagement />;
      case "alerts":
        return isSeller ? <SalesManagement /> : <AlertsManagement />;
      case "scanner":
        return isSeller ? <SalesManagement /> : <ScannerManagement />;
      case "catalogs":
        return isSeller ? <SalesManagement /> : <CatalogsManagement />;
      case "returns":
        return isSeller ? <SalesManagement /> : <ReturnsManagement />;
      case "cash-closure":
        return <CashClosureManagement />;
      case "users":
        return isSeller ? <SalesManagement onSectionChange={setActiveSection} /> : <UserManagement />;
      case "promotions":
        return isSeller ? <SalesManagement onSectionChange={setActiveSection} /> : <PromotionsManagement />;
      default:
        return isSeller ? <SalesManagement onSectionChange={setActiveSection} /> : <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <div className="flex flex-1 min-h-0">
        <Sidebar activeSection={activeSection} onSectionChange={setActiveSection} />
        <main className="flex-1 overflow-auto min-h-0">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default Index;
