import React, { useState, useEffect } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../ui/accordion";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { ScrollArea } from "../ui/scroll-area";
import { Card } from "../ui/card";

export default function Eligibility({ caseId }) {
  const [opportunityData, setOpportunityData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [transformedData, setTransformedData] = useState([]);

  const labelMap = {
    businessLoan: "Business Loan",
    homeLoanValue: "Home Loan / Balance Transfer",
    loanAgainstProperty: "Loan Against Property / Balance Transfer",
    termPlan: "Term Plan",
    generalInsurance: "General Insurance",
  };

  const commissionMap = {
    "Business Loan": 1.0,
    "Home Loan / Balance Transfer": 0.45,
    "Loan Against Property / Balance Transfer": 0.65,
    "Term Plan": "1 % -30",
    "General Insurance": "upto 10",
  };

  useEffect(() => {
    async function fetchOpportunityData() {
      try {
        // Use Electron's ipcRenderer to call the backend method
        const data = await window.electron.getOpportunityToEarn(caseId);
        setOpportunityData(data);

        console.log("Opportunity data:", data);

        const transformedData = data.map((item) => {
          const newObj = {};
          for (const [key, value] of Object.entries(item)) {
            if (key === "caseId" || key === "id") continue;
            newObj[labelMap[key]] = value;
          }

          return newObj;
        });

        setTransformedData(transformedData);

        console.log("Transformed data:", transformedData);

        setLoading(false);
      } catch (err) {
        console.log(err);
        setError(err);
        setLoading(false);
      }
    }

    fetchOpportunityData();
  }, [caseId]);

  const defaultData = [
    {
      type: "Home Loan / Balance Transfer",
      amount: 905000,
      rate: "0.45%",
      value: 4072.5,
    },
    {
      type: "Loan Against Property / Balance Transfer",
      amount: 763000,
      rate: "0.65%",
      value: 4959.5,
    },
    { type: "Business Loan", amount: 205000, rate: "1.00 %", value: 2050 },
    { type: "Term Plan", amount: "-", rate: "1 % -30 %", value: 4072.5 },
    {
      type: "General Insurance",
      amount: "-",
      rate: "upto 10 %",
      value: 4072.5,
    },
  ];

  const note = [
    {
      title: "To Proceed Further:",
      content: `In case your client is interested in any of the above products, you can contact our trusted vendor M/s BizPedia Tech Private Limited on 8828824242 and email id support@leadsathi.in. Kindly use the promo code "CYPHERSOLEARN" to avail the higher commission structure.
  
      Once the referrals are successfully closed, you will be eligible for payouts based on the above commission structure.
  
      The respective payments will be released on the 25th of the next month.`,
    },
    {
      title: "Disclaimer:",
      content: [
        "The above loan eligibility calculations apply to self-employed clients only.",
        "For salaried clients, the vendor will need more details to calculate the eligibility.",
        "The above eligibility is based on the analysis of the current uploaded bank statement. Kindly upload all bank statements to obtain more accurate eligibility.",
        "Final Approval will be dependent on complete thorough process and submission of relevant documents, CIBIL check, etc.",
        "Nothing contained in this eligibility should be deemed to create any right and/or interest whatsoever in favor of or against any party.",
      ],
    },
  ];

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error loading data: {error.message}</div>;

  return (
    <ScrollArea className="h-full">
      <div className="p-8 pt-0 space-y-8">
        <div className="text-left">
          <h2 className="text-3xl font-extrabold to-blue-400 dark:text-slate-300">
            Opportunity to Earn
          </h2>
          <p className="text-gray-600 mt-2 dark:text-[#7F8EA3]">
            Discover the products you're eligible for and the associated
            benefits.
          </p>
        </div>
        <Card className="p-4 rounded-lg">
          <Accordion type="single" collapsible className="w-full">
            {/* Replace with actual names from fetched data if available */}
            {["Aiyaz Qureshi", "Poojan vig"].map((name, index) => (
              <AccordionItem key={index} value={`item-${index + 1}`}>
                <AccordionTrigger className="font-bold">
                  {name}
                </AccordionTrigger>
                <AccordionContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead className="text-center">Amount</TableHead>
                        <TableHead className="text-center">
                          Commission %
                        </TableHead>
                        <TableHead className="text-right">
                          Commission (in Rs)
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transformedData.map((item, idx) => (
                        <>
                          {Object.keys(item).map((key) => (
                            <TableRow key={idx}>
                              <TableCell className="font-medium">
                                {key}
                              </TableCell>
                              <TableCell className="text-center">
                                {item[key]
                                  ? parseFloat(item[key]).toFixed(1)
                                  : 0}
                                {/* {item[key]} */}
                              </TableCell>
                              <TableCell className="text-center">
                                {commissionMap[key]}%
                              </TableCell>
                              <TableCell className="text-right">
                                {item[key]
                                  ? Math.floor(
                                      item[key] * commissionMap[key] * 10
                                    ) / 10
                                  : 0}
                                {/* {(item[key] * commissionMap[key]) / 100} */}
                              </TableCell>
                            </TableRow>
                          ))}
                        </>
                      ))}
                    </TableBody>
                  </Table>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Card>

        {note.map((section, index) => (
          <Card key={index} className="p-6 rounded-lg shadow-sm">
            <h4 className="text-lg font-semibold text-gray-700 mb-2 dark:text-white">
              {section.title}
            </h4>
            {Array.isArray(section.content) ? (
              <ul className="list-none space-y-1 text-gray-600 dark:text-slate-300">
                {section.content.map((item, idx) => (
                  <li key={idx} className="flex items-start">
                    <span className="mr-2 mt-1 text-black dark:text-slate-300">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-600 dark:text-slate-300">
                {section.content}
              </p>
            )}
          </Card>
        ))}
      </div>
    </ScrollArea>
  );
}
