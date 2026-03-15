# 建筑包工头 - 施工管理系统

<div align="center">

[![GitHub stars](https://img.shields.io/github/stars/jop324/baogongtou-app?style=flat)](https://github.com/jop324/baogongtou-app/stargazers)
[![GitHub license](https://img.shields.io/github/license/jop324/baogongtou-app)](https://github.com/jop324/baogongtou-app)
[![Platform](https://img.shields.io/badge/platform-Windows-blue)](https://github.com/jop324/baogongtou-app/releases)
[![Release](https://img.shields.io/github/v/release/jop324/baogongtou-app)](https://github.com/jop324/baogongtou-app/releases)

基于 Tauri + React + Node.js 构建的建筑工程施工管理系统

</div>

## ✨ 功能介绍

### 1. 工人管理
- 添加工人信息（姓名、工种、日薪）
- 编辑/删除工人
- 工人列表展示

### 2. 考勤管理
- **快速录入**：单日快速考勤录入
- **月度表格**：按月查看/编辑考勤
  - 周视图/全月视图切换
  - 周末高亮显示
  - 快捷下拉选择（1天/半天/1天+/缺勤）

### 3. 施工记录
- 记录每日施工情况
- 关联工人
- 备注说明

### 4. 支出记录
- 生活费发放记录
- 工资发放记录
- 按工人/月份筛选

### 5. 统计查询
- 月度概览卡片（在职工人、总工日，生活费、工资、总支出）
- 工人明细统计
  - 出勤天数
  - 生活费支出
  - 工资支出
  - 合计支出
  - **剩余工钱**（应收工资 - 已发生活费 - 已发工资）

### 6. 数据导出
- 导出为 CSV 格式（可用 Excel/WPS 打开）
- 支持导出：工人信息、考勤记录、支出记录、月度汇总表

## 🛠️ 技术栈

| 层级 | 技术 |
|------|------|
| 前端框架 | React 18 + TypeScript |
| UI 框架 | Tailwind CSS |
| 构建工具 | Vite |
| 桌面框架 | Tauri 2.x |
| 后端 | Node.js + Express (打包为独立可执行文件) |
| 数据库 | SQLite (sql.js) |

## 📦 安装

### 方式一：直接安装（推荐）

下载最新安装包：

安装后即可使用，**无需安装 Node.js**。

### 方式二：开发模式运行

#### 前置要求

- Node.js 18+
- Rust 1.70+
- pnpm 或 npm

#### 安装步骤

```bash
# 1. 克隆项目
git clone https://github.com/jop324/baogongtou-app.git
cd baogongtou-app

# 2. 安装前端依赖
cd client
npm install

# 3. 安装后端依赖
cd ../server
npm install

# 4. 启动后端服务
npm start

# 5. 启动开发模式（新终端）
cd ../client
npm run tauri dev
```

### 方式三：手动构建

```bash
# 1. 安装依赖
cd client && npm install
cd ../server && npm install

# 2. 构建前端
cd ../client
npm run build

# 3. 打包 Tauri 应用
cd src-tauri
npx tauri build
```

构建完成后，安装包位于：
```
client/src-tauri/target/release/bundle/nsis/建筑包工头_1.0.0_x64-setup.exe
```

## 📁 项目结构

```
baogongtou-app/
├── client/                 # 前端 Tauri 应用
│   ├── src/               # React 源代码
│   │   ├── pages/        # 页面组件
│   │   ├── components/   # 通用组件
│   │   ├── api.ts        # API 调用
│   │   └── types/        # TypeScript 类型
│   ├── src-tauri/        # Tauri 配置
│   └── dist/             # 构建输出
├── server/               # 后端服务
│   ├── src/
│   │   ├── index.js      # Express 服务入口（开发用）
│   │   └── db.js         # 数据模型
│   ├── app.js            # 打包用入口文件
│   └── server.exe        # 打包后的独立可执行文件
└── README.md
```

## 🔧 配置

### 修改端口

后端默认端口 `3001`，如需修改：

1. 编辑 `server/app.js`（打包用）：
```javascript
const PORT = process.env.PORT || 3001; // 改为其他端口
```

2. 编辑 `client/src/api.ts`：
```typescript
const API_BASE = import.meta.env.PROD ? 'http://localhost:3001/api' : '/api';
// 改为新端口
```

### 数据位置

- **开发环境**：`server/data.db`
- **安装后**：`exe同目录/data.db`

数据文件自动创建在程序所在目录，无需手动配置。

### 数据备份

直接复制 `data.db` 文件即可备份或迁移数据。

## ⚡ 性能优化

- **SQLite 数据库**：相比 JSON 文件，查询性能提升显著，支持万级数据流畅运行
- **独立服务端**：打包为独立 exe，无需客户安装 Node.js
- **静默启动**：服务端无窗口，随主程序自动启动/关闭

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License - 自由使用、修改和分发

## 🐛 问题反馈

如有 Bug 或功能建议，请提交 [Issue](https://github.com/jop324/baogongtou-app/issues)

---

<p align="center">Made with ❤️ for construction workers</p>
