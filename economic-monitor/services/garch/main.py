# GARCH Analysis Service
# 用于 SOFR 等高频金融数据的波动率建模和异常检测
#
# 运行方式:
#   pip install -r requirements.txt
#   uvicorn main:app --host 0.0.0.0 --port 8000
#
# Docker 部署:
#   docker build -t garch-service .
#   docker run -p 8000:8000 garch-service

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, List
import numpy as np
from arch import arch_model
import pandas as pd
from datetime import datetime
import logging

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="GARCH Analysis Service",
    description="波动率建模服务 - 专为 SOFR 等高频金融数据设计",
    version="1.0.0",
)

# CORS 配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ========== 数据模型 ==========


class FitRequest(BaseModel):
    series_id: str = Field(..., description="指标ID，如 SOFR")
    values: List[float] = Field(..., description="历史数据序列")
    p: int = Field(1, ge=1, le=5, description="GARCH(p) 阶数")
    q: int = Field(1, ge=1, le=5, description="ARCH(q) 阶数")
    dist: str = Field("t", description="残差分布: 'normal', 't', 'skewt'")
    mean_model: str = Field(
        "Constant", description="均值模型: 'Constant', 'Zero', 'ARX'"
    )


class FitResponse(BaseModel):
    success: bool
    series_id: str
    model_spec: dict
    params: Optional[dict] = None
    interpretation: Optional[str] = None
    conditional_volatility: List[float] = []
    volatility_regimes: Optional[dict] = None
    aic: Optional[float] = None
    bic: Optional[float] = None
    error: Optional[str] = None


class AnomalyRequest(BaseModel):
    current_value: float = Field(..., description="当前值")
    historical_values: List[float] = Field(..., description="历史数据")
    confidence_level: float = Field(0.95, ge=0.9, le=0.99, description="置信水平")


class AnomalyResponse(BaseModel):
    success: bool
    is_anomaly: bool
    severity: str  # normal, warning, critical
    z_score: float
    conditional_volatility: float
    value_at_risk_95: float
    explanation: str
    current_value: float
    confidence_level: float


class ForecastRequest(BaseModel):
    values: List[float] = Field(..., description="历史数据")
    horizon: int = Field(5, ge=1, le=30, description="预测期数")


class ForecastResponse(BaseModel):
    success: bool
    volatility_forecast: List[float]
    annualized_volatility: List[float]
    variance_forecast: List[float]
    confidence_intervals: Optional[dict] = None
    interpretation: Optional[str] = None
    error: Optional[str] = None


class HealthResponse(BaseModel):
    status: str
    service: str
    version: str
    timestamp: str


# ========== 核心功能 ==========


def fit_garch_model(
    values: np.ndarray,
    p: int = 1,
    q: int = 1,
    dist: str = "t",
    mean_model: str = "Constant",
) -> dict:
    """
    拟合 GARCH 模型

    参数:
        values: 数据序列
        p: GARCH 阶数
        q: ARCH 阶数
        dist: 残差分布
        mean_model: 均值模型

    返回:
        模型结果字典
    """
    # 计算对数收益率（更适合 GARCH）
    returns = 100 * np.diff(np.log(values))

    if len(returns) < 100:
        raise ValueError(f"数据不足: 需要至少100个观测值，当前有{len(returns)}个")

    # 拟合 GARCH 模型
    model = arch_model(returns, mean=mean_model, vol="GARCH", p=p, q=q, dist=dist)

    result = model.fit(disp="off")

    # 提取参数
    params = {
        "mu": float(result.params.get("mu", 0)),
        "omega": float(result.params.get("omega", 0)),
        "alpha": float(result.params.get("alpha[1]", 0)),
        "beta": float(result.params.get("beta[1]", 0)),
    }

    # 计算波动率持续性
    persistence = params["alpha"] + params["beta"]

    # 半衰期计算
    if persistence < 1:
        half_life = np.log(0.5) / np.log(persistence)
    else:
        half_life = float("inf")

    # 波动率状态分类
    cond_vol = result.conditional_volatility
    vol_mean = np.mean(cond_vol)
    vol_std = np.std(cond_vol)

    volatility_regimes = {
        "low": float(vol_mean - vol_std),
        "high": float(vol_mean + vol_std),
        "current": float(cond_vol[-1]),
        "mean": float(vol_mean),
    }

    # 生成解释
    interpretation = generate_interpretation(
        params, persistence, half_life, volatility_regimes
    )

    return {
        "success": True,
        "model_spec": {
            "p": p,
            "q": q,
            "dist": dist,
            "mean_model": mean_model,
        },
        "params": {
            **params,
            "persistence": float(persistence),
            "half_life": float(half_life),
        },
        "conditional_volatility": cond_vol.tolist(),
        "volatility_regimes": volatility_regimes,
        "aic": float(result.aic),
        "bic": float(result.bic),
        "log_likelihood": float(result.loglikelihood),
        "interpretation": interpretation,
    }


def generate_interpretation(
    params: dict, persistence: float, half_life: float, regimes: dict
) -> str:
    """生成模型解释"""

    # 波动率持续性解读
    if persistence > 0.9:
        persistence_text = "波动率具有极强的持续性，大波动后会持续较长时间"
    elif persistence > 0.7:
        persistence_text = "波动率有一定持续性，冲击影响约1-2周"
    else:
        persistence_text = "波动率回归较快，市场相对稳定"

    # 半衰期解读
    if half_life == float("inf"):
        half_life_text = "波动率不收敛，需要警惕"
    elif half_life > 30:
        half_life_text = f"波动率半衰期约{half_life:.0f}天，冲击影响持久"
    elif half_life > 14:
        half_life_text = f"波动率半衰期约{half_life:.0f}天，冲击影响约2-4周"
    else:
        half_life_text = f"波动率半衰期约{half_life:.0f}天，冲击影响较快消退"

    return f"""
GARCH(1,1) 模型分析结果:

【模型参数】
- 短期冲击响应 (α): {params["alpha"]:.4f}
- 波动率持续性 (β): {params["beta"]:.4f}
- 波动率持续性 (α+β): {persistence:.4f}
- 半衰期: {half_life:.1f} 天

【当前波动率状态】
- 当前波动率: {regimes["current"]:.4f}%
- 历史平均: {regimes["mean"]:.4f}%

【解读】
{persistence_text}
{half_life_text}

【市场含义】
当前波动率水平: {"偏高" if regimes["current"] > regimes["high"] else "偏低" if regimes["current"] < regimes["low"] else "正常"}
""".strip()


def detect_anomaly_with_garch(
    current_value: float, historical_values: List[float], confidence_level: float = 0.95
) -> dict:
    """
    基于 GARCH 的异常检测

    与传统 Z-Score 的区别:
    - GARCH 使用时变波动率，危机时期波动率更高
    - 不假设波动率恒定，更适合金融数据
    - 可以捕捉"波动聚集"效应
    """

    values = np.array(historical_values)

    if len(values) < 100:
        raise ValueError("需要至少100个历史数据点")

    # 拟合 GARCH(1,1)
    result = fit_garch_model(values, p=1, q=1, dist="t")

    # 获取当前条件波动率
    cond_vol = result["conditional_volatility"][-1]

    # 计算当前收益率
    returns = 100 * np.diff(np.log(values))
    current_return = (current_value - values[-2]) / values[-2] * 100

    # 基于条件波动率的 Z-Score
    z_score = current_return / cond_vol

    # 计算 VaR（基于 t 分布）
    from scipy import stats

    alpha = 1 - confidence_level
    var_quantile = stats.t.ppf(alpha, df=4)  # 假设自由度为4
    value_at_risk = abs(var_quantile * cond_vol)

    # 判断异常
    abs_z = abs(z_score)
    if abs_z < 2:
        severity = "normal"
        explanation = f"当前利率 {current_value:.4f}% 波动正常 (Z={z_score:.2f})，处于条件波动率范围内"
    elif abs_z < 3:
        severity = "warning"
        explanation = (
            f"利率波动偏高 (Z={z_score:.2f})，当前波动率 {cond_vol:.4f}% 高于历史平均"
        )
    else:
        severity = "critical"
        explanation = f"⚠️ 利率异常波动 (Z={z_score:.2f})！当前波动率 {cond_vol:.4f}%，可能预示流动性问题"

    return {
        "success": True,
        "is_anomaly": abs_z > 2,
        "severity": severity,
        "z_score": float(z_score),
        "conditional_volatility": float(cond_vol),
        "value_at_risk_95": float(value_at_risk),
        "explanation": explanation,
        "current_value": current_value,
        "confidence_level": confidence_level,
    }


# ========== API 端点 ==========


@app.get("/", response_model=HealthResponse)
async def health_check():
    """健康检查"""
    return HealthResponse(
        status="healthy",
        service="GARCH Analysis Service",
        version="1.0.0",
        timestamp=datetime.now().isoformat(),
    )


@app.post("/fit", response_model=FitResponse)
async def fit_model(request: FitRequest):
    """
    拟合 GARCH 模型

    示例请求:
    ```json
    {
        "series_id": "SOFR",
        "values": [5.25, 5.26, 5.24, ...],
        "p": 1,
        "q": 1,
        "dist": "t"
    }
    ```
    """
    try:
        logger.info(
            f"拟合 GARCH 模型: {request.series_id}, 数据点: {len(request.values)}"
        )

        values = np.array(request.values)
        result = fit_garch_model(
            values,
            p=request.p,
            q=request.q,
            dist=request.dist,
            mean_model=request.mean_model,
        )

        return FitResponse(
            success=True,
            series_id=request.series_id,
            model_spec=result["model_spec"],
            params=result["params"],
            interpretation=result["interpretation"],
            conditional_volatility=result["conditional_volatility"],
            volatility_regimes=result["volatility_regimes"],
            aic=result["aic"],
            bic=result["bic"],
        )

    except Exception as e:
        logger.error(f"拟合失败: {e}")
        return FitResponse(
            success=False, series_id=request.series_id, model_spec={}, error=str(e)
        )


@app.post("/anomaly", response_model=AnomalyResponse)
async def detect_anomaly(request: AnomalyRequest):
    """
    基于 GARCH 的异常检测

    特点:
    - 使用时变波动率（而非恒定波动率）
    - 能捕捉波动聚集效应
    - 对危机时期的异常更敏感

    与 Z-Score 的区别:
    - Z-Score 假设波动率恒定
    - GARCH 允许波动率随时间变化
    - 利率飙升时，GARCH 会自动提高阈值
    """
    try:
        logger.info(
            f"异常检测: 当前值={request.current_value}, 历史={len(request.historical_values)}"
        )

        result = detect_anomaly_with_garch(
            request.current_value, request.historical_values, request.confidence_level
        )

        return AnomalyResponse(**result)

    except Exception as e:
        logger.error(f"异常检测失败: {e}")
        return AnomalyResponse(
            success=False,
            is_anomaly=False,
            severity="normal",
            z_score=0,
            conditional_volatility=0,
            value_at_risk_95=0,
            explanation=f"检测失败: {str(e)}",
            current_value=request.current_value,
            confidence_level=request.confidence_level,
        )


@app.post("/forecast", response_model=ForecastResponse)
async def forecast_volatility(request: ForecastRequest):
    """
    预测未来波动率

    返回:
    - 未来N期的波动率预测
    - 年化波动率
    - 置信区间
    """
    try:
        values = np.array(request.values)
        returns = 100 * np.diff(np.log(values))

        # 拟合 GARCH(1,1)
        model = arch_model(returns, vol="GARCH", p=1, q=1, dist="t")
        result = model.fit(disp="off")

        # 预测
        forecast = result.forecast(horizon=request.horizon)
        variance_forecast = forecast.variance.iloc[-1].values
        volatility_forecast = np.sqrt(variance_forecast)

        # 年化波动率
        annualized = volatility_forecast * np.sqrt(252)

        # 置信区间 (近似)
        std_error = volatility_forecast / np.sqrt(len(returns))
        lower = volatility_forecast - 1.96 * std_error
        upper = volatility_forecast + 1.96 * std_error

        interpretation = f"""
波动率预测结果:
- 预测期数: {request.horizon} 天
- 预期波动率: {np.mean(volatility_forecast):.4f}%/天
- 年化波动率: {np.mean(annualized):.2f}%
- 趋势: {"上升" if volatility_forecast[-1] > volatility_forecast[0] else "下降" if volatility_forecast[-1] < volatility_forecast[0] else "稳定"}
""".strip()

        return ForecastResponse(
            success=True,
            volatility_forecast=volatility_forecast.tolist(),
            annualized_volatility=annualized.tolist(),
            variance_forecast=variance_forecast.tolist(),
            confidence_intervals={
                "lower": lower.tolist(),
                "upper": upper.tolist(),
            },
            interpretation=interpretation,
        )

    except Exception as e:
        logger.error(f"预测失败: {e}")
        return ForecastResponse(
            success=False,
            volatility_forecast=[],
            annualized_volatility=[],
            variance_forecast=[],
            error=str(e),
        )


@app.get("/compare/{series_id}")
async def compare_methods(series_id: str, values: str):
    """
    比较 GARCH vs Z-Score 的检测结果

    用于展示两种方法的区别
    """
    try:
        vals = [float(v) for v in values.split(",")]
        current_value = vals[-1]
        historical = vals[:-1]

        # Z-Score 结果
        z_mean = np.mean(historical)
        z_std = np.std(historical)
        z_score = (current_value - z_mean) / z_std

        # GARCH 结果
        garch_result = detect_anomaly_with_garch(current_value, historical)

        return {
            "series_id": series_id,
            "current_value": current_value,
            "methods": {
                "zscore": {
                    "mean": float(z_mean),
                    "std": float(z_std),
                    "z_score": float(z_score),
                    "is_anomaly": abs(z_score) > 2,
                    "assumption": "波动率恒定",
                },
                "garch": {
                    "conditional_volatility": garch_result["conditional_volatility"],
                    "z_score": garch_result["z_score"],
                    "is_anomaly": garch_result["is_anomaly"],
                    "assumption": "时变波动率",
                },
            },
            "comparison": {
                "zscore_threshold": 2,
                "garch_threshold": 2,
                "difference": "GARCH 在危机时期会自动提高波动率阈值，减少误报",
            },
        }

    except Exception as e:
        return {"error": str(e)}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
