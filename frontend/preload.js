const { contextBridge, ipcRenderer, shell } = require("electron");

// Expose a secure API for opening files to the renderer process
contextBridge.exposeInMainWorld("electron", {
  openFile: (filePath) => ipcRenderer.invoke("open-file", filePath),

  getTransactions: (caseId) => ipcRenderer.invoke("get-transactions", caseId),

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
    login: (userData) => ipcRenderer.invoke("auth:login", userData),
    logout: () => ipcRenderer.invoke("auth:logout"),
    getUser: () => ipcRenderer.invoke("auth:getUser"),
    // updateUser: (userData) => ipcRenderer.invoke('auth:updateUser', userData)
    checkLicense: () => ipcRenderer.invoke("license:check"),
    activateLicense: (credentials) =>
      ipcRenderer.invoke("license:activate", credentials),
  },

  getRecentReports: () => ipcRenderer.invoke("get-recent-reports"),

  shell: {
    openExternal: (url) => shell.openExternal(url),
  },
});
