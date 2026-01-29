# 🌸 禅意经济数据看板

一个极简而富有禅意的美式经济指标监控仪表板，采用Tokyo Night美学设计。

## ✨ 特色

- **🎨 禅意设计**: 简洁、宁静、专注
- **🌙 Tokyo Night**: 深色主题，护眼舒适
- **📊 数据优先级**: 重要数据突出，次要数据弱化
- **📱 响应式**: 完美适配各种设备
- **⚡ 极速加载**: 优化的性能体验

## 📊 功能

### 经济数据看板
- **关键指标**: 联邦基金利率、CPI、失业率、GDP增长率
- **次要指标**: 美元指数、标普500
- **参考指标**: M2货币供应量、新屋开工（弱化显示）

### 高级统计分析
- **动态统计计算**: 基于用户选择的时间范围自动重新计算所有统计指标
- **Z-Score异常检测**: 使用完整时间范围数据进行标准化异常检测
- **GARCH波动率模型**: 高级波动率预测和条件波动率计算
- **波动率趋势分析**: 滚动窗口波动率计算、突破点检测、波动率聚类
- **语义洞察引擎**: 上下文感知的智能洞察生成，提供趋势、波动率、变化分析
- **跨资产相关性分析**: Pearson相关系数计算、统计显著性检验、相关性矩阵
- **自适应数据粒度**: 根据时间范围自动调整数据粒度（日/周/月/季度）

### 交易记录
- **统计概览**: 总交易数、已完成、待处理、总交易额
- **筛选功能**: 全部/买入/卖出快速切换
- **详细信息**: 交易时间、资产、价格、状态、备注

## 🚀 部署

### 本地运行
```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

### 环境变量
```env
FRED_API_KEY=your_fred_api_key_here
NEXTAUTH_SECRET=your_nextauth_secret_here
```

### 数据获取
- **定时任务**: 每日自动获取最新经济数据
- **API集成**: FRED (Federal Reserve Economic Data)
- **数据质量**: 自动验证和修复缺失数据

## 🎯 技术栈

- **前端**: Next.js 14 + TypeScript + Tailwind CSS
- **样式**: 自定义CSS，Tokyo Night配色
- **字体**: Noto Sans SC + Inter
- **部署**: Vercel自动部署
- **数据**: FRED API + SQLite本地存储
- **统计分析**: 
  - 独立统计计算模块（均值、标准差、Z-Score）
  - GARCH(1,1)波动率模型
  - Pearson相关系数计算
  - 统计显著性检验（t-test）
- **架构**: 模块化设计，完全解耦

## 📝 API Endpoints

### 数据更新
```
POST /api/cron/fetch-data     # 定时获取数据
POST /api/cron/weekly-full-sync  # 周全量同步
GET  /api/data                 # 获取经济数据
```

### 高级统计分析
```
GET  /api/economic-data        # 经济数据（含动态统计计算）
GET  /api/volatility-analysis  # 波动率分析（趋势、突破、聚类）
GET  /api/semantic-analysis    # 语义洞察分析（上下文感知）
GET  /api/correlation-analysis # 跨资产相关性分析
GET  /api/adaptive-granularity # 自适应数据粒度调整
```

### 用户功能
```
GET  /api/user/indicators     # 用户关注指标
POST /api/user/config         # 用户配置
GET  /api/user/anomalies      # 异常检测
```

## 🔧 配置

### 支持的经济指标
- **利率**: FEDFUNDS, DGS1, DGS10
- **通胀**: CPIAUCSL, PCEPI
- **就业**: UNRATE, CIVPART, EMRATIO, PAYEMS
- **GDP**: GDPC1, GDPPOT, GDP, EXPGS, IMPGS
- **市场**: SP500, DCOILWTICO, DEXCHUS
- **房地产**: HOUST
- **货币**: M2SL

## 🌍 许可证

MIT License - 可自由使用、修改和分发

---

> 💡 **设计理念**: "少即是多" - 去除冗余，聚焦核心信息，营造宁静的数据分析体验。

> 📈 **数据来源**: 美国联邦储备银行FRED数据库，实时更新，可靠准确。