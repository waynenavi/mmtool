# MMTOOL · Polymarket 做市策略工具

实时拉取 Polymarket 体育市场盘口数据，支持做市准入检查、参数计算、AI 分析和情景预案。

---

## 部署步骤（约 10 分钟，不需要任何编程经验）

### 第一步：注册 GitHub 账号
访问 https://github.com → Sign up（免费）

### 第二步：创建仓库并上传文件

1. 登录 GitHub 后点右上角 **+** → **New repository**
2. 仓库名填：`mmtool`，选 **Public**，点 **Create repository**
3. 点页面中间的 **uploading an existing file**
4. 将以下文件拖入上传区（保持目录结构）：
   ```
   vercel.json
   package.json
   api/gamma.js
   api/clob.js
   public/index.html
   ```
5. 点 **Commit changes**

### 第三步：注册 Vercel 并部署

1. 访问 https://vercel.com → Sign up → **Continue with GitHub**（用刚才的账号登录）
2. 点 **Add New Project**
3. 找到 `mmtool` 仓库，点 **Import**
4. 所有选项保持默认，直接点 **Deploy**
5. 等待约 1 分钟，看到 **Congratulations!** 表示部署成功
6. 点 **Visit** 获得你的专属链接，格式类似：
   ```
   https://mmtool-xxxxxxxx.vercel.app
   ```

---

## 使用说明

- **左侧列表**：实时 Polymarket 体育市场，自动按价差排序
- **筛选按钮**：按运动类型、价差、交易量过滤
- **最小价差%**：调整筛选门槛（建议 1.5%–3%）
- **点击市场**：右侧显示实时订单簿、六项准入检查、做市参数计算
- **AI 分析**：基于真实盘口生成操盘建议（需要点按钮触发）
- **情景预案**：进球、红牌、VAR 等突发情景的实时处理建议
- **自动刷新**：每 90 秒自动更新数据

---

## 数据说明

| 数据类型 | 来源 | 延迟 |
|---------|------|------|
| 市场列表 | Polymarket Gamma API | ~30秒缓存 |
| 实时盘口 | Polymarket CLOB API | ~10秒缓存 |
| AI 分析 | Claude claude-sonnet-4-6 | 实时生成 |

所有数据完全公开，不需要 Polymarket 账号即可查看。

---

## 后续迭代计划

- [ ] Kalshi 跨平台价差对比（需要 Kalshi API）
- [ ] 每日最优 4 个标的自动推荐
- [ ] 盘口深度变化告警
- [ ] 历史盘口走势图
- [ ] 做市收益记录
