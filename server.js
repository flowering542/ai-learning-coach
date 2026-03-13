// Coach HTTP 服务 - 常驻进程
import express from 'express';
import { coachTool } from './coach-tool.js';
const app = express();
app.use(express.json());
const PORT = process.env.COACH_PORT || 3000;
const ADMIN_IDS = (process.env.COACH_ADMIN_QQ_IDS || '').split(',').filter(Boolean);
// 健康检查
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
// 主 API 端点
app.post('/api/coach', async (req, res) => {
    try {
        const { command, userId, platform = 'qq' } = req.body;
        if (!userId) {
            return res.status(400).json({ error: 'Missing userId' });
        }
        // 允许空 command，让 coachTool 处理
        const result = await coachTool(command || '', userId, platform, ADMIN_IDS);
        res.json(result);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// 启动服务 - 明确绑定到所有接口（IPv4 + IPv6）
app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Coach HTTP] 服务已启动，端口: ${PORT}`);
    console.log(`[Coach HTTP] 管理员: ${ADMIN_IDS.length} 人`);
});
