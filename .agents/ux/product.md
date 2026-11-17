<!-- lobe-design-init: version=6.3.1 fingerprint=53dd9a1e60b4 -->

# 产品画像（lobe-design・Round 1）

平台：desktop

> 由 lobe-design 05-init 生成。任何 UI 任务先读本文件与 [components.md](components.md)，再进 stage。重跑 init 时整份更新，不追加。
> 视觉 token 与品牌语气以仓库根的 `DESIGN.md` / `DESIGN.dark.md` 为准；用户流程的设计价值（自然 / 意义感 / 确定性 / 成长）见 `ux` skill；Channel 相关的项目规则见 [lobe-design-rules.md](lobe-design-rules.md)（`LOBE-UX-xxx`，按 id 查）。三者冲突时：token 听 `DESIGN.md`，流程听 `ux`，其余按 lobe-design 的 stage。

## 一句话

Lobot 是 LobeHub 出品的桌面 IM 客户端（`package.json`：「IM-only channel client」）：在一个窗口里和自己的 Agent、团队的 Channel 聊天。它不是完整的 LobeHub 工作空间 —— 只保留**消息**与**通讯录**两个 tab，加上设置。

## 平台与外壳

只有一个发布目标：**Electron 桌面应用**（macOS / Windows / Linux，见 `README.md` 与 `electron-builder.mjs`）。渲染层是跑在 Electron 里的 React DOM SPA（`src/`），原子层取自 `@lobehub/ui`，web 的组件与 lint 规则照常适用。

| 入口            | 位置                                                                                               | 说明                                                                                                         |
| --------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| 主窗口          | `index.html` → `src/spa/entry.desktop.tsx`，路由在 `src/spa/router/`，页面段在 `src/routes/(main)` | 无边框窗口：自绘标题栏（`features/Electron/titlebar`），每个 tab 一个独立路由（`features/Electron/TabHost`） |
| 本地首启设置    | `src/routes/(desktop)/desktop-onboarding`（`features/DesktopOnboarding`）                          | 欢迎、登录、数据模式、系统权限、保持唤醒                                                                     |
| 账号引导        | `src/routes/onboarding`（`features/Onboarding`）                                                   | 本地设置之后、账号未完成引导时进入：称呼、兴趣、回复语言、遥测等                                             |
| 截屏浮层        | `overlay.html` → `electron/overlay/`                                                               | 透明全屏浮层：框选屏幕区域，附带截图向 Agent 提问                                                            |
| 主进程 / 预加载 | `electron/main`、`electron/preload`                                                                | 菜单、托盘、通知、更新、IPC；不含 UI 页面                                                                    |

交互前提：鼠标 + 键盘为主，快捷键重度使用（`hotkey` skill、`features/HotkeyHelperPanel`）。窗口可被拉窄：低于断点时进入**紧凑布局**（`features/NavRail/compactLayout.ts`），像手机 IM 一样一次只显示列表栏或内容，内容页带返回。这是窄窗口形态，**不是移动端**：仓库里没有 mobile 入口、mobile 路由或 React Native 代码。

## 信息架构

- **消息 tab**（默认）：左侧列表栏是按最新活动排序的会话列表（`features/MessageList`：Lobe AI、Agent 私聊、群组、Channel），右侧是会话（`/channels/:channelId`，`features/Channels`）。首页直接跳到最近有消息的 Channel；没有 Channel 时显示空态 logo 页（`DesktopHomeRoute`）。所有会话都以 Channel 呈现。
- **Channel 内**：主时间线 + 输入框；线程（`?thread=`）、回复所在的 Agent 话题、成员面板、外链 / 报告都在右侧栏打开，窄时浮在会话上。Channel 设置在 `/channels/:channelId/settings`（常规、成员、回复、危险操作）。
- **通讯录 tab**：`/agents`（Agent 与群组列表）、`/agents/:id`（联系人卡片）、`/agents/people/:userId`（人）、`/agents/shared/:share`（别人分享的 Agent）；加联系人走 `AddContactModal`。
- **设置**：从头像进入，`/settings/:tab(/:sub)`：个人资料、外观、语言、通知、快捷键、代理、关于；带设置搜索（`features/SettingsSearch`）。
- **空间切换**：`features/WorkspaceRail` 是 Discord 式的空间栏（个人空间 + 各工作区），切换后所有请求走该空间；服务端没有工作区时（自部署）隐藏。
- 其他 LobeHub 路由（发现、文档、资源、任务、看板、设置里的模型 / 服务商等）**不在本构建里**（`desktopRouter.shared.tsx` 注释明确）。`src/features` 下仍有不少从 LobeHub 带过来的目录，它们没有路由入口时不代表产品面。

## 产品类型

消费级 IM 客户端：人与 Agent 混合的即时通讯（私聊、群组、Channel、线程）。主体是会话列表 + 时间线 + 输入框；设置是个人偏好页。不是 Agent 工作空间、不是管理后台、不是营销站。

## 用户

| 角色                    | 权限边界                                                                    | 使用频率       |
| ----------------------- | --------------------------------------------------------------------------- | -------------- |
| 个人用户                | 自己的 Agent、私有 Channel、联系人与设置；可把自己的机器作为 Agent 执行设备 | 高频，每天多次 |
| 工作区成员              | 工作区 Channel、成员与共享 Agent；按 Channel 权限发言、开线程               | 高频           |
| Channel 所有者 / 管理员 | 邀请 / 移除成员、Channel 设置、归档与删除（见 `LOBE-UX-005`）               | 中频           |
| 外部联系人              | 通过用户名或分享链接加进来的人 / Agent，只看被分享的内容                    | 偶发           |

## 核心任务

1. 打开消息列表，进入最近的会话，读未读消息。
2. 在 Channel 或私聊里给 Agent / 人发消息（@ 提及、附件、截图），跟踪 Agent 的接收与回复进度。
3. 从某条消息开线程，在侧栏查看线程或回复背后的 Agent 话题。
4. 新建 Channel：先定类型（普通 / 项目）、名称与是否私有，再选成员（人与 Agent）；Agent 的设备与目录从其配置继承（`LOBE-UX-002`）。
5. 在通讯录里查找、添加联系人，打开联系人卡片开始聊天或编辑 Agent 资料。
6. 在个人空间与工作区之间切换；在设置里改外观、语言、通知、快捷键、代理。
7. 框选屏幕区域，把截图发给 Agent 提问（截屏浮层）。

## 适用性

| 规则 / 原型                                    | 结论       | 说明                                                                                                                                                    |
| ---------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C-04 对话界面的组合顺序                        | 强调       | 会话是主路径；Channel 时间线复用 `features/Conversation` 的 `ChatItem` / `Markdown`，输入框是 `@lobehub/editor` 的 `ChatInput`                          |
| E-02 `@lobehub/editor`                         | 强调       | 输入框（@ 提及、斜杠命令、附件）是最高频件；消息正文统一走 `features/Conversation/Markdown`（基于 `@lobehub/ui` 的 `Markdown`），不另引 markdown 渲染库 |
| K-05 / X-1 状态与反馈                          | 强调       | 同步中、发送中、Agent 接收 / 准备 / 回复中、失败重试都有长时间中间态；进度规则见 `LOBE-UX-006` / `LOBE-UX-008` / `LOBE-UX-012`                          |
| D-07 主题声明、D-08 暗色模式                   | 强调       | 主色与中性色由用户配置（见 `DESIGN.md`），一律走 `cssVar`，不写死色值                                                                                   |
| D-09 / X-6 响应式                              | 强调       | 只针对窗口宽度：宽窗双栏 + 右侧栏，窄窗紧凑单栏；右侧栏低于断点时浮在会话上。新页面要在紧凑布局下确认返回路径                                           |
| X-5 / K-07 可访问性                            | 强调       | 键盘可达（快捷键、命令面板）、图标按钮要有可访问名；悬停只能做增强，必要信息不能只放在 `Tooltip` 里                                                     |
| P-02 列表 / 搜索 / 筛选、P-03 详情             | 适用       | 会话列表、通讯录、联系人卡片、线程浏览                                                                                                                  |
| P-04 新建 / 编辑表单、P-05 配置 / 设置         | 适用       | 新建 Channel、Agent 身份表单、Channel 设置、个人设置；就地编辑优先（C-17）                                                                              |
| P-01 总览看板、P-07 监控、P-08 计费、P-09 评测 | 不作为默认 | 本构建没有这些页面；不要为 Lobot 新造                                                                                                                   |
| C-07 / C-08 控制台套件、A-08 后台密度档        | 不作为默认 | 按 IM 的消费级密度；设置页可略密，但不用控制台套件                                                                                                      |
| 20 视觉方向 / 落地页类场景                     | 少量       | 没有营销页；只有首启引导、空态 logo 页有记忆点需求                                                                                                      |
| C-20 mobile 浮动框架                           | 不适用     | 没有 mobile 入口；紧凑布局沿用桌面的实底页头                                                                                                            |
| LOBE-RN-DOM-UI 与 React Native 专属条目        | 不适用     | 渲染层是 Electron 里的 DOM SPA，不是 RN                                                                                                                 |

## 文案

copy-profile: consumer

- 人称：**你**（`channel` 等 Lobot 自己的命名空间全部用「你」）；`setting` 等从 LobeHub 继承的命名空间里还有「您」，改到时统一成「你」。
- 用户的词优先，按 zh-CN locale 的现有译法：tab 叫「消息」「通讯录」；Channel 在中文界面叫**频道**；Agent 保留英文「Agent」；不写实现词（job、replica、topic id）。
- Channel 内承接某条消息的独立讨论统一称为 **thread（线程）**，不称「分支」；Agent 产出回复所在的会话是 **topic（话题）**，只读，不和线程混用。
- i18n：默认文案写在 `packages/locales/src/default/*.ts`，手工同步 `locales/en-US` 与 `locales/zh-CN`，其余语言由 CI 翻译（见 `i18n` skill）。Electron 主进程的文案在 `electron/main/locales`（`bun run i18n:electron`）。
