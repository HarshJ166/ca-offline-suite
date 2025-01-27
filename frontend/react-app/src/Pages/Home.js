import React, { useState, useMemo, useEffect } from "react";
import {
  LayoutDashboard,
  FilePlus2,
  Files,
  Import,
  ChartNoAxesCombined,
  ReceiptIndianRupee,
  ReceiptText,
  IndianRupee,
} from "lucide-react";
import ReportGenerator from "../components/MainDashboardComponents/GenerateReport";
import { cn } from "../lib/utils";
import { ScrollArea } from "../components/ui/scroll-area";

import Sidebar from "../components/Sidebar";
import MainDashboard from "../components/MainDashboardComponents/MainDashboard";
import Eligibility from "../components/MainDashboardComponents/Eligibility";
import Billing from "../components/MainDashboardComponents/Billing";
import { Toaster } from "../components/ui/toaster";
import Analytics from "../components/MainDashboardComponents/Analytics";
import ExcelViewer from "../components/ImortTally/TallyPrime";
import ExcelERP from "../components/ImortTally/TallyERP";
import { BreadcrumbDynamic } from "../components/BreadCrumb";
import { useBreadcrumb } from "../contexts/BreadcrumbContext";
import { useParams } from "react-router-dom";
import PdfColumnMarker from "../components/MainDashboardComponents/PdfMarker";

const Dashboard = () => {
  const { breadcrumbs, setMainDashboard } = useBreadcrumb();
  const [activeTab, setActiveTab] = useState("Dashboard");
  const [pdfColMarkerData, setPdfColMarkerData] = useState([]);
  const { defaultTab } = useParams();

  const navItems = [
    {
      title: "Dashboard",
      url: "#",
      icon: LayoutDashboard,
      isActive: true,
    },
    {
      title: "Generate Report",
      url: "#",
      icon: FilePlus2,
    },
    {
      title: "Analytics",
      url: "#",
      icon: ChartNoAxesCombined,
    },
    {
      title: "Import to Tally",
      url: "#",
      icon: Import,
      items: [
        {
          title: "TallyPrime",
          url: "#",
          icon: null,
        },
        {
          title: "TallyERP",
          url: "#",
          icon: null,
        },
      ],
      alwaysOpen: true, // Ensures the section remains open
    },
    {
      title: "Opportunity to Earn",
      url: "#",
      icon: IndianRupee,
    },
    {
      title: "Billing",
      url: "#",
      icon: ReceiptText,
    },
    {
      title:"Marker",
      url:"#",
      icon:Files
    }
  ];

  useEffect(() => {
    if (!defaultTab || defaultTab === "defaultTab")
      setActiveTab(navItems[0].title);
    else setActiveTab(defaultTab);
  }, []);

  useEffect(() => {
    setMainDashboard(activeTab, `/${activeTab}`);
  }, [activeTab]);

  const handleTabChange = (newTab) => {
    setActiveTab(newTab);
    const scrollableNode = document.querySelector(
      "[data-radix-scroll-area-viewport]"
    );
    if (scrollableNode) {
      scrollableNode.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleFinalSubmitPDFMarker = () => {
    const data = {
      bank_names: ["HDFC", "ICICI"],
      pdf_paths: ["/home/Downloads/ICICI.pdf", "/home/Downloads/HDFC.pdf"],
      passwords: ["1234", "1234"],
      start_dates: ["01-01-2021", "01-01-2021"],
      end_dates: ["31-12-2021", "31-12-2021"],
      CA_ID: 1,
      columns: pdfColMarkerData,
    };
    console.log(data);
  };

  useEffect(() => {
    const data = {
      bank_names: ["HDFC", "ICICI"],
      pdf_paths: ["/home/Downloads/ICICI.pdf", "/home/Downloads/HDFC.pdf"],
      passwords: ["1234", "1234"],
      start_dates: ["01-01-2021", "01-01-2021"],
      end_dates: ["31-12-2021", "31-12-2021"],
      CA_ID: 1,
      columns: pdfColMarkerData,
    };
    console.log(data);
  }, [pdfColMarkerData]);

  return (
    <>
      <div className={cn("h-full w-full flex h-screen bg-background")}>
        <Sidebar
          navItems={navItems}
          activeTab={activeTab}
          setActiveTab={handleTabChange} // Changed from setActiveTab to handleTabChange
        />
        <ScrollArea className="w-full">
          <BreadcrumbDynamic items={breadcrumbs} />
          <div className="flex-1 flex flex-col overflow-hidden">
            <main className="flex-1">
              {activeTab === "Dashboard" && <MainDashboard />}
              {activeTab === "Generate Report" && <ReportGenerator />}
              {activeTab === "Opportunity to Earn" && <Eligibility />}
              {activeTab === "Billing" && <Billing />}

              {activeTab === "Analytics" && <Analytics />}
              {activeTab === "Marker" && (
                <PdfColumnMarker setPdfColMarkerData={setPdfColMarkerData} />
              )}
              {/* {activeTab === "Import to Tally" && <ImportToTally />} */}
              {activeTab === "TallyPrime" && <ExcelViewer />}
              {activeTab === "TallyERP" && <ExcelERP />}
            </main>
          </div>
        </ScrollArea>
        <Toaster />
      </div>
    </>
  );
};

export default Dashboard;
