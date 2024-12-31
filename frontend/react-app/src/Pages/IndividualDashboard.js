import React, { useEffect, useState } from 'react';
import { cn } from "../lib/utils";
import { ScrollArea } from "../components/ui/scroll-area";
import Sidebar from "../components/Sidebar";
import AccountNumNameManager from "../components/CaseDashboardComponents/AccountNumNameManager";
import IndividualTable from "../components/CaseDashboardComponents/IndividualTable";
import Summary from "../components/IndividualDashboardComponents/Summary";
import Transactions from "../components/IndividualDashboardComponents/Transactions";
import Cash from "../components/IndividualDashboardComponents/Cash";
import Suspense from "../components/IndividualDashboardComponents/Suspense";
import { useBreadcrumb } from '../contexts/BreadcrumbContext';
import { useParams } from 'react-router-dom';
import {BreadcrumbDynamic}  from '../components/BreadCrumb';

const IndividualDashboard = () => {

    const [activeTab, setActiveTab] = useState('Summary');
    const { breadcrumbs,setIndividualDashboard } = useBreadcrumb();
    const { caseId, individualId,defaultTab} = useParams();

    

    useEffect(() => {
      setIndividualDashboard(activeTab, `/individual-dashboard/${caseId}/${individualId}/${activeTab}`);
    }, [activeTab]);

  const navItems = [
    {
      title: "Summary",
      icon: null,
      isActive: true,
    },
    {
      title: "Transactions",
      icon: null,
    },
    {
      title: "EOD",
      icon: null,
    },
    {
      title: "Suspense",
      icon: null,
    },
    {
      title: "Cash",
      icon: null,
    },
    {
      title: "Debitors",
      icon: null,
    },
    {
      title: "Creditors",
      icon: null,
    },
    {
      title: "EMI",
      icon: null,
    },
    {
      title: "Investments",
      icon: null,
    },
  ];

  useEffect(() => {
    if (defaultTab==="defaultTab") setActiveTab(navItems[0].title);
    else setActiveTab(defaultTab);
  }, []);

  return (
    <>
      <div className={cn("w-full flex h-screen bg-background")}>
        <Sidebar
          navItems={navItems}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
        />
        <ScrollArea className="w-full">
          <BreadcrumbDynamic items={breadcrumbs}/>
          <div className="flex-1 flex flex-col overflow-hidden">
            <main className="flex-1">
              {activeTab === "Summary" && <Summary />}
              {activeTab === "Transactions" && <Transactions />}
              {activeTab === "Cash" && <Cash />}
              {activeTab === "Suspense" && <Suspense />}
            </main>
          </div>
        </ScrollArea>
      </div>
    </>
  );
};

export default IndividualDashboard;
