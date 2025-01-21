const { ipcMain } = require('electron');
const fs = require('fs');
const path = require('path');
const log = require('electron-log');
const axios = require('axios');
const db = require('../db/db');
const { eq } = require('drizzle-orm');
const { transactions } = require('../db/schema/Transactions.js');
const { statements } = require('../db/schema/Statement.js');

// Helper function to validate and transform transaction data
const validateAndTransformTransaction = (transaction, statementId) => {
  if (!transaction.date || !transaction.description || !transaction.amount) {
    throw new Error('Missing required transaction fields');
  }

  return {
    statementId,
    date: new Date(transaction.date),
    description: transaction.description,
    amount: parseFloat(transaction.amount),
    category: transaction.category || 'uncategorized',
    type: transaction.type || 'unknown',
    balance: parseFloat(transaction.balance || 0),
    entity: transaction.entity || 'unknown'
  };
};

// Helper function to store transactions in batches
const storeTransactionsBatch = async (transformedTransactions) => {
  try {
    // Use batch insert for better performance
    await db.insert(transactions).values(transformedTransactions);
    log.info(`Successfully stored ${transformedTransactions.length} transactions`);
  } catch (error) {
    log.error('Error storing transactions batch:', error);
    throw error;
  }
};

function generateReportIpc() {
  ipcMain.handle('generate-report', async (event, result) => {
    log.info('IPC handler invoked for generate-report');
    
    try {
      // Input validation
      if (!result?.files?.length) {
        throw new Error('Invalid or empty files array received');
      }

      // Log incoming request data
      log.info('Processing request with files:', 
        result.files.map(f => ({ 
          bankName: f.bankName, 
          start_date: f.start_date, 
          end_date: f.end_date 
        }))
      );

      const tempDir = path.join(__dirname, '..', 'tmp');
      fs.mkdirSync(tempDir, { recursive: true });

      // Process file details
      const fileDetails = result.files.map((fileDetail, index) => {
        if (!fileDetail.pdf_paths || !fileDetail.bankName) {
          throw new Error(`Missing required fields for file at index ${index}`);
        }

        const filePath = path.join(tempDir, fileDetail.pdf_paths);
        
        if (fileDetail.fileContent) {
          fs.writeFileSync(filePath, fileDetail.fileContent, 'binary');
        } else {
          log.warn(`No file content for ${fileDetail.bankName}`);
        }

        return {
          ...fileDetail,
          pdf_paths: filePath,
          start_date: fileDetail.start_date || '',
          end_date: fileDetail.end_date || ''
        };
      });

      // Prepare API payload
      const payload = {
        bank_names: fileDetails.map(d => d.bankName),
        pdf_paths: fileDetails.map(d => d.pdf_paths),
        passwords: fileDetails.map(d => d.passwords || ''),
        start_date: fileDetails.map(d => d.start_date || ''),
        end_date: fileDetails.map(d => d.end_date || ''),
        ca_id: fileDetails[0]?.ca_id || 'DEFAULT_CASE'
      };

      // Make API request with detailed error handling
      const response = await axios.post(
        'http://localhost:7500/analyze-statements/',
        payload,
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 300000,
          validateStatus: status => status === 200
        }
      );

      // Validate response data
      if (!response.data) {
        throw new Error('Empty response received from analysis server');
      }

      // Log response structure for debugging
      log.info('Response structure:', {
        statusCode: response.status,
        hasData: !!response.data,
        dataKeys: Object.keys(response.data)
      });

      // Process transactions from response
      const processedData = [];
      for (const statement of response.data.statements || []) {
        // Create statement record first
        const statementId = statement.id || `ST-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        // Transform transactions
        const statementTransactions = (statement.transactions || [])
          .map(transaction => {
            try {
              return validateAndTransformTransaction(transaction, statementId);
            } catch (error) {
              log.warn('Invalid transaction data:', { transaction, error: error.message });
              return null;
            }
          })
          .filter(Boolean);

        // Store transactions in batches of 100
        const batchSize = 100;
        for (let i = 0; i < statementTransactions.length; i += batchSize) {
          const batch = statementTransactions.slice(i, i + batchSize);
          await storeTransactionsBatch(batch);
        }

        processedData.push({
          statementId,
          transactionCount: statementTransactions.length
        });
      }

      // Cleanup temp files
      fileDetails.forEach(detail => {
        try {
          fs.unlinkSync(detail.pdf_paths);
        } catch (error) {
          log.warn(`Failed to cleanup temp file: ${detail.pdf_paths}`, error);
        }
      });

      return { 
        success: true, 
        data: {
          processed: processedData,
          totalTransactions: processedData.reduce((sum, d) => sum + d.transactionCount, 0)
        }
      };

    } catch (error) {
      log.error('Error in report generation:', {
        message: error.message,
        stack: error.stack,
        response: error.response?.data,
        status: error.response?.status
      });
      
      throw {
        message: error.message || 'Failed to generate report',
        code: error.response?.status || 500,
        details: error.response?.data || error.toString(),
        timestamp: new Date().toISOString()
      };
    }
  });
}

module.exports = { generateReportIpc };