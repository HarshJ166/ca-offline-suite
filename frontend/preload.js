const { contextBridge, ipcRenderer } = require("electron");

// Expose a secure API for opening files to the renderer process
contextBridge.exposeInMainWorld("electron", {
  openFile: (filePath) => ipcRenderer.invoke("open-file", filePath),

  getTransactions: () => ipcRenderer.invoke("get-transactions"),

  getTransactionsByDebtor: () =>
    ipcRenderer.invoke("get-transactions-by-debtor"),

  getTransactionsByCreditor: () =>
    ipcRenderer.invoke("get-transactions-by-creditor"),

  getTransactionsByCashWithdrawal: () =>
    ipcRenderer.invoke("get-transactions-by-cashwithdrawal"),

  getTransactionsByCashDeposit: () =>
    ipcRenderer.invoke("get-transactions-by-cashdeposit"),

  getTransactionsBySuspenseCredit: () =>
    ipcRenderer.invoke("get-transactions-by-suspensecredit"),

  getTransactionsBySuspenseDebit: () =>
    ipcRenderer.invoke("get-transactions-by-suspensedebit"),

  getTransactionsByEmi: () => ipcRenderer.invoke("get-transactions-by-emi"),
  getTransactionsByInvestment: () =>
    ipcRenderer.invoke("get-transactions-by-investment"),
  getTransactionsByReversal: () =>
    ipcRenderer.invoke("get-transactions-by-reversal"),

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
    login: (userData) => ipcRenderer.invoke('auth:login', userData),
    logout: () => ipcRenderer.invoke('auth:logout'),
    getUser: () => ipcRenderer.invoke('auth:getUser'),
    // updateUser: (userData) => ipcRenderer.invoke('auth:updateUser', userData)
    checkLicense: () => ipcRenderer.invoke('license:check'),
    activateLicense: (credentials) => ipcRenderer.invoke('license:activate', credentials)
  },

  getRecentReports: () => ipcRenderer.invoke("get-recent-reports"),
});
