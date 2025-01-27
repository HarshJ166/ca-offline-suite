const { contextBridge, ipcRenderer, shell } = require("electron");
const { generateReportIpc } = require("./ipc/generateReport");

// Expose a secure API for opening files to the renderer process
contextBridge.exposeInMainWorld("electron", {
  openFile: (filePath) => ipcRenderer.invoke("open-file", filePath),

  getTransactions: (caseId) => ipcRenderer.invoke("get-transactions", caseId),
  getTransactionsCount: (caseId) =>
    ipcRenderer.invoke("get-transactions-count", caseId),
  getEodBalance: (caseId) => ipcRenderer.invoke("get-eod-balance", caseId),
  getSummary: (caseId) => ipcRenderer.invoke("get-summary", caseId),
  getTransactionsByDebtor: (caseId) =>
    ipcRenderer.invoke("get-transactions-by-debtor", caseId),

  getTransactionsByCreditor: (caseId) =>
    ipcRenderer.invoke("get-transactions-by-creditor", caseId),

  getTransactionsByCashWithdrawal: (caseId) =>
    ipcRenderer.invoke("get-transactions-by-cashwithdrawal", caseId),

  getTransactionsByCashDeposit: (caseId) =>
    ipcRenderer.invoke("get-transactions-by-cashdeposit", caseId),

  getTransactionsBySuspenseCredit: (caseId) =>
    ipcRenderer.invoke("get-transactions-by-suspensecredit", caseId),

  getTransactionsBySuspenseDebit: (caseId) =>
    ipcRenderer.invoke("get-transactions-by-suspensedebit", caseId),

  getTransactionsByEmi: (caseId) =>
    ipcRenderer.invoke("get-transactions-by-emi", caseId),
  getTransactionsByInvestment: (caseId) =>
    ipcRenderer.invoke("get-transactions-by-investment", caseId),
  getTransactionsByReversal: (caseId) =>
    ipcRenderer.invoke("get-transactions-by-reversal", caseId),

  getStatements: (case_id) => ipcRenderer.invoke("get-statements", case_id),

  updateStatement: ({ id, customerName, accountNumber }) =>
    ipcRenderer.invoke("update-statement", { id, customerName, accountNumber }),

  getCombinedStatements: (case_id) =>
    ipcRenderer.invoke("get-combine-statements", case_id),

  saveFileToTemp: (fileBuffer) =>
    ipcRenderer.invoke("save-file-to-temp", fileBuffer),
  cleanupTempFiles: () => ipcRenderer.invoke("cleanup-temp-files"),
  generateReportIpc: (result, reportName) =>
    ipcRenderer.invoke("generate-report", result, reportName),

  addPdfIpc: (data, caseId) => ipcRenderer.invoke("add-pdf", data, caseId),    

  user: {
    getData: (userId) => ipcRenderer.invoke("user:get-data", userId),
    updateData: (userData) => ipcRenderer.send("user:update-data", userData),
  },

  file: {
    open: (filePath) => ipcRenderer.send("file:open", filePath),
    save: (fileContent) => ipcRenderer.invoke("file:save", fileContent),
    getData: (filePath) => ipcRenderer.invoke("file:get-data", filePath),
  },

  auth: {
    signUp: (credentials) => ipcRenderer.invoke("auth:signUp", credentials),
    login: (userData) => ipcRenderer.invoke("auth:login", userData),
    logout: () => ipcRenderer.invoke("auth:logout"),
    getUser: () => ipcRenderer.invoke("auth:getUser"),
    // updateUser: (userData) => ipcRenderer.invoke('auth:updateUser', userData)
    checkLicense: () => ipcRenderer.invoke("license:check"),
    activateLicense: (credentials) =>
      ipcRenderer.invoke("license:activate", credentials),
  },

  getRecentReports: () => ipcRenderer.invoke("get-recent-reports"),
  getFailedStatements: (referenceId) => ipcRenderer.invoke("get-failed-statements", referenceId),

  shell: {
    openExternal: (url) => shell.openExternal(url),
  },

  shell: {
    openExternal: (url) => shell.openExternal(url),
  },
});
