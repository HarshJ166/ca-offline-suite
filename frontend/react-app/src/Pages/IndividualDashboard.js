import React, { useEffect, useState } from "react";
import { cn } from "../lib/utils";
import { ScrollArea } from "../components/ui/scroll-area";
import Sidebar from "../components/Sidebar";
import Summary from "../components/IndividualDashboardComponents/Summary";
import Transactions from "../components/IndividualDashboardComponents/Transactions";
import Cash from "../components/IndividualDashboardComponents/Cash";
import Suspense from "../components/IndividualDashboardComponents/Suspense";
import { useBreadcrumb } from "../contexts/BreadcrumbContext";
import { useParams } from "react-router-dom";
import { BreadcrumbDynamic } from "../components/BreadCrumb";
import Debtors from "../components/IndividualDashboardComponents/Debtors";
import Creditors from "../components/IndividualDashboardComponents/Creditors";
import EMI from "../components/IndividualDashboardComponents/EMI";
import Investment from "../components/IndividualDashboardComponents/Investment";
import EodBalance from "../components/IndividualDashboardComponents/EodBalance";
import Reversal from "../components/IndividualDashboardComponents/Reversal";
import ForeignTransactions from "../components/IndividualDashboardComponents/ForeignTransactions";
import {
  ArrowDownWideNarrow,
  ArrowRightLeft,
  ArrowUpNarrowWide,
  ChartNoAxesCombined,
  ClipboardList,
  FileQuestion,
  History,
  IndianRupee,
  MessageSquareText,
  Undo2,
} from "lucide-react";

const IndividualDashboard = () => {
  const [activeTab, setActiveTab] = useState("Summary");
  const { breadcrumbs, setIndividualDashboard } = useBreadcrumb();
  const { caseId, individualId, defaultTab } = useParams();

  useEffect(() => {
    setIndividualDashboard(
      activeTab,
      `/individual-dashboard/${caseId}/${individualId}/${activeTab}`
    );
  }, [activeTab]);

  const navItems = [
    {
      title: "Summary",
      icon: ClipboardList,
      isActive: true,
    },
    {
      title: "Transactions",
      icon: ArrowRightLeft,
    },
    {
      title: "EOD",
      icon: History,
    },
    {
      title: "Suspense",
      icon: FileQuestion,
    },
    {
      title: "Cash",
      icon: IndianRupee,
    },
    {
      title: "Debtors",
      url: "#",
      icon: ArrowUpNarrowWide,
    },
    {
      title: "Creditors",
      icon: ArrowDownWideNarrow,
    },
    {
      title: "EMI",
      icon: MessageSquareText,
    },
    {
      title: "Investment",
      url: "#",
      icon: ChartNoAxesCombined,
    },
    {
      title: "Reversal",
      url: "#",
      icon: Undo2,
    },
  ];

  useEffect(() => {
    if (defaultTab === "defaultTab") setActiveTab(navItems[0].title);
    else setActiveTab(defaultTab);
  }, []);

  const handleTabChange = (newTab) => {
    setActiveTab(newTab);
    const scrollableNode = document.querySelector(
      "[data-radix-scroll-area-viewport]"
    );
    if (scrollableNode) {
      scrollableNode.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  console.log("Statement", individualId);

  return (
    <>
      <div className={cn("w-full flex h-screen bg-background")}>
        <Sidebar
          navItems={navItems}
          activeTab={activeTab}
          setActiveTab={handleTabChange}
        />
        <ScrollArea className="w-full">
          <BreadcrumbDynamic items={breadcrumbs} />
          <div className="flex-1 flex flex-col overflow-hidden">
            <main className="flex-1">
              {activeTab === "Summary" && <Summary caseId={caseId} />}
              {activeTab === "Transactions" && <Transactions caseId={caseId} />}
              {activeTab === "Debtors" && <Debtors caseId={caseId} />}
              {activeTab === "Creditors" && <Creditors caseId={caseId} />}
              {activeTab === "EMI" && <EMI caseId={caseId} />}
              {activeTab === "Investment" && <Investment caseId={caseId} />}
              {activeTab === "EOD" && <EodBalance caseId={caseId} />}
              {activeTab === "Cash" && <Cash caseId={caseId} />}
              {activeTab === "Suspense" && <Suspense caseId={caseId} />}
              {activeTab === "Reversal" && <Reversal caseId={caseId} />}
              {/* {activeTab === "Reversal" && <ForeignTransactions />} */}
            </main>
          </div>
        </ScrollArea>
      </div>
    </>
  );
};

export default IndividualDashboard;
