# GARCH Analysis Service

用于 SOFR 等高频金融数据的波动率建模和异常检测。

## 为什么需要 GARCH？

### Z-Score 的局限

传统 Z-Score 假设波动率是**恒定的**：

```
标准差 = 0.5%（永远不变）
```

但现实中，**危机时期波动率会急剧上升**：

```
正常时期：波动率 = 0.1%
危机时期：波动率 = 1.0%（10倍！）
```

问题：危机时的小幅波动（0.2%）用 Z-Score 计算可能触发异常，但实际是"正常的危机波动"。

### GARCH 的优势

GARCH 允许波动率**随时间变化**：

```
正常时期：波动率 = 0.1%
危机时期：波动率 = 1.0%（自动调整）

当前值 5.5%，历史均值 5.0%：
- Z-Score：(5.5-5.0)/0.5 = 1.0 → 正常
- 但如果危机时期，波动率是 1.0：
- GARCH Z-Score：(5.5-5.0)/1.0 = 0.5 → 更合理
```

## 快速开始

### 1. 安装依赖

```bash
pip install -r requirements.txt
```

### 2. 启动服务

```bash
uvicorn main:app --host 0.0.0.0 --port 8000
```

### 3. 测试

```bash
# 健康检查
curl http://localhost:8000/

# 拟合 GARCH 模型
curl -X POST http://localhost:8000/fit \
  -H "Content-Type: application/json" \
  -d '{
    "series_id": "SOFR",
    "values": [5.25, 5.26, 5.24, 5.28, ...],
    "p": 1,
    "q": 1,
    "dist": "t"
  }'

# 异常检测
curl -X POST http://localhost:8000/anomaly \
  -H "Content-Type: application/json" \
  -d '{
    "current_value": 5.5,
    "historical_values": [5.1, 5.15, 5.12, ...],
    "confidence_level": 0.95
  }'

# 波动率预测
curl -X POST http://localhost:8000/forecast \
  -H "Content-Type: application/json" \
  -d '{
    "values": [5.25, 5.26, 5.24, ...],
    "horizon": 5
  }'
```

## API 端点

| 端点 | 方法 | 描述 |
|------|------|------|
| `/` | GET | 健康检查 |
| `/fit` | POST | 拟合 GARCH 模型 |
| `/anomaly` | POST | 基于 GARCH 的异常检测 |
| `/forecast` | POST | 波动率预测 |
| `/compare/{series_id}` | GET | 比较 GARCH vs Z-Score |

## Docker 部署

```bash
# 构建镜像
docker build -t garch-service .

# 运行容器
docker run -p 8000:8000 garch-service
```

## 与 Next.js 集成

在 Next.js 中调用 GARCH 服务：

```typescript
// lib/garch-client.ts
const GARCH_URL = process.env.GARCH_SERVICE_URL || 'http://localhost:8000';

export async function detectGarchAnomaly(
  currentValue: number,
  historicalValues: number[]
) {
  const response = await fetch(`${GARCH_URL}/anomaly`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      current_value: currentValue,
      historical_values: historicalValues,
      confidence_level: 0.95,
    }),
  });
  return response.json();
}
```

## 指标分类

### GARCH 指标（高频金融）

| 指标 | Series ID | 频率 | 说明 |
|------|-----------|------|------|
| SOFR | SOFR | 每日 | 隔夜融资利率 |
| 2年期国债 | DGS2 | 每日 | 货币政策敏感 |
| 10年期国债 | DGS10 | 每日 | 市场基准 |
| 抵押贷款利率 | MORTGAGE30US | 每周 | 房地产市场 |
| TED利差 | TEDRATE | 每日 | 信用风险先行 |

### Z-Score 指标（实体经济）

| 指标 | Series ID | 频率 | 说明 |
|------|-----------|------|------|
| GDP | GDPC1 | 季度 | 经济产出 |
| 失业率 | UNRATE | 每月 | 劳动力市场 |
| PCE通胀 | PCEPI | 每月 | 通胀指标 |
| 零售销售 | RSAFS | 每月 | 消费需求 |
| 房价指数 | CSUSHPISA | 每月 | 房地产市场 |

## 算法对比

| 维度 | GARCH | Z-Score |
|------|-------|---------|
| 波动率假设 | 时变 | 恒定 |
| 数据频率 | 每日/每周 | 月度/季度 |
| 波动聚集 | ✅ 捕捉 | ❌ 无法处理 |
| 危机检测 | 更敏感 | 可能误报 |
| 计算复杂度 | 高 | 低 |
| 数据需求 | ≥100点 | ≥12点 |

## 实际案例

### SOFR 利率飙升检测

正常时期：
```
SOFR: 5.10% → 5.12% → 5.09% → 5.11%
日波动: ~2bps
Z-Score: ~0.5 → 正常
GARCH: 波动率 = 0.1% → 正常
```

流动性紧缩前夕：
```
SOFR: 5.10% → 5.15% → 5.25% → 5.38%
日波动: ~15-30bps
Z-Score: ~2-3 → 可能误报异常
GARCH: 波动率 = 0.8% → 识别为"高波动但正常"
```

### 2020年3月流动性危机

```
SOFR 从 1.5% 飙升至 3%+

Z-Score 视角：
- 偏离历史均值 15 个标准差
- 触发严重异常警报

GARCH 视角：
- 波动率从 0.1% 升至 1.5%+
- Z-Score = (3-1.5)/1.5 = 1.0
- 识别为"波动率飙升但值在预期范围内"
- 更准确地反映市场状况
```

## 注意事项

1. **数据量**：GARCH 需要至少100个历史数据点
2. **频率**：适合每日/每周数据，不适合月度/季度
3. **更新**：建议每周重新拟合模型以捕捉最新波动特征
4. **服务分离**：GARCH 服务是独立的 Python 服务，与 Next.js 分离部署
