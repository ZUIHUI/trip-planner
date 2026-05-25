const sendJson = (res, status, payload) => {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(payload));
};

module.exports = async (req, res) => {
  res.setHeader('Allow', 'GET');
  sendJson(res, 401, {
    error: 'authentication_required',
    message: '航班查詢已改由登入後的安全服務處理，請在 Trip Planner 內使用航班查詢。'
  });
};
