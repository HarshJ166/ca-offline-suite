const { ipcMain } = require('electron');
const log = require('electron-log');
const path = require('path');
const axios = require('axios');
const db = require('../db/db');

function generateReportIpc() {
  ipcMain.handle('generate-report', async (event, data) => {
    try {
      log.info('Starting report generation process with data:', data);
      
      // Validate input data
      if (!data || !Array.isArray(data)) {
        throw new Error('Invalid file details format. Expected an array.');
      }

      if (data.length === 0) {
        throw new Error('No files provided for processing.');
      }

      // Validate each file detail object
      data.forEach((detail, index) => {
        if (!detail.file || !detail.file.name) {
          throw new Error(`Invalid file data at index ${index}`);
        }
      });

      // Construct the payload with validation
      const payload = {
        bank_names: data.map(detail => detail.bankName || ''),
        pdf_paths: data.map(detail => 
          path.join(process.cwd(), 'frontend', 'data', detail.file.name)
        ),
        passwords: data.map(detail => detail.password || ''),
        start_date: data.map(detail => detail.startDate || ''),
        end_date: data.map(detail => detail.endDate || ''),
        ca_id: data[0]?.caseId || 'DEFAULT_CASE'
      };

      log.info('Constructed payload:', {
        bankCount: payload.bank_names.length,
        fileCount: payload.pdf_paths.length,
        paths: payload.pdf_paths
      });

      // Make the API call
      const response = await axios.post(
        'http://localhost:7500/analyze-statements/',
        payload,
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 300000 // 5 minute timeout
        }
      );

      if (!response.data) {
        throw new Error('No data received from analysis server');
      }

      log.info('Analysis complete, storing results');

      // Store results in database
      const analysisResult = {
        case_id: payload.ca_id,
        result_data: JSON.stringify(response.data),
        created_at: new Date().toISOString()
      };

      await db('analysis_results').insert(analysisResult);

      log.info('Successfully stored analysis results');

      return {
        success: true,
        data: response.data
      };

    } catch (error) {
      log.error('Error in report generation:', error);

      throw {
        message: error.message || 'Failed to generate report',
        code: error.response?.status || 500,
        details: error.toString(),
        timestamp: new Date().toISOString()
      };
    }
  });
}

module.exports = {generateReportIpc};