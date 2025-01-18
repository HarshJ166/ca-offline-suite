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

  user: {
    getData: (userId) => ipcRenderer.invoke("user:get-data", userId),
    updateData: (userData) => ipcRenderer.send("user:update-data", userData),
  },

  file: {
    open: (filePath) => ipcRenderer.send("file:open", filePath),
    save: (fileContent) => ipcRenderer.invoke("file:save", fileContent),
    getData: (filePath) => ipcRenderer.invoke("file:get-data", filePath),
  },

  getRecentReports: () => ipcRenderer.invoke("get-recent-reports"),
});
