const reportsService = require('./reports.service');
const { success, error } = require('../../utils/apiResponse');

/**
 * GET /monthly - Get comprehensive monthly report.
 * Query: year, month
 */
async function getMonthlyReport(req, res) {
  try {
    const { year, month } = req.query;

    if (!year || !month) {
      return error(res, 'year and month query parameters are required', 400);
    }

    const yearNum = parseInt(year, 10);
    const monthNum = parseInt(month, 10);

    if (isNaN(yearNum) || isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
      return error(res, 'year must be a valid number and month must be between 1 and 12', 400);
    }

    const report = await reportsService.getMonthlyReport(req.user.id, yearNum, monthNum);
    return success(res, report, 'Monthly report generated successfully');
  } catch (err) {
    return error(res, 'Failed to generate monthly report', 500);
  }
}

/**
 * GET /weekly - Get weekly summary report.
 * Query: weekStartDate (ISO date string)
 */
async function getWeeklyReport(req, res) {
  try {
    const { weekStartDate } = req.query;

    if (!weekStartDate) {
      return error(res, 'weekStartDate query parameter is required', 400);
    }

    const parsed = new Date(weekStartDate);
    if (isNaN(parsed.getTime())) {
      return error(res, 'weekStartDate must be a valid ISO date string', 400);
    }

    const report = await reportsService.getWeeklyReport(req.user.id, parsed);
    return success(res, report, 'Weekly report generated successfully');
  } catch (err) {
    return error(res, 'Failed to generate weekly report', 500);
  }
}

/**
 * GET /custom - Get custom date range report.
 * Query: startDate, endDate (ISO date strings)
 */
async function getCustomReport(req, res) {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return error(res, 'startDate and endDate query parameters are required', 400);
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return error(res, 'startDate and endDate must be valid ISO date strings', 400);
    }

    if (start > end) {
      return error(res, 'startDate must be before or equal to endDate', 400);
    }

    const report = await reportsService.getCustomReport(req.user.id, start, end);
    return success(res, report, 'Custom report generated successfully');
  } catch (err) {
    return error(res, 'Failed to generate custom report', 500);
  }
}

/**
 * GET /export - Export expense data for a date range.
 * Query: startDate, endDate, format (csv|json)
 */
async function getExpenseExportData(req, res) {
  try {
    const { startDate, endDate, format } = req.query;

    if (!startDate || !endDate) {
      return error(res, 'startDate and endDate query parameters are required', 400);
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return error(res, 'startDate and endDate must be valid ISO date strings', 400);
    }

    const exportFormat = format || 'csv';
    if (exportFormat !== 'csv' && exportFormat !== 'json') {
      return error(res, 'format must be either "csv" or "json"', 400);
    }

    const rows = await reportsService.getExpenseExportData(req.user.id, start, end, exportFormat);

    if (exportFormat === 'csv') {
      const header = 'date,category,amount,notes,isImpulse';
      const csvRows = rows.map((r) => {
        const escapedNotes = r.notes.includes(',') ? `"${r.notes}"` : r.notes;
        return `${r.date},${r.category},${r.amount},${escapedNotes},${r.isImpulse}`;
      });
      const csvContent = [header, ...csvRows].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=expenses_${startDate}_${endDate}.csv`);
      return res.send(csvContent);
    }

    return success(res, rows, 'Expense data exported successfully');
  } catch (err) {
    return error(res, 'Failed to export expense data', 500);
  }
}

module.exports = {
  getMonthlyReport,
  getWeeklyReport,
  getCustomReport,
  getExpenseExportData,
};
