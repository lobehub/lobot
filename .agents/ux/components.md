<!-- lobe-design-init: version=6.3.1 fingerprint=53dd9a1e60b4 -->

# 组件盘点（lobe-design・Round 2）

> 由 lobe-design 05-init 生成。只写「哪个场景用哪个 + 注意点」，不写实现和 props。重跑 init 时整份更新。
> 平台：desktop（Electron 里的 DOM SPA，见 [product.md](product.md)），分类按 web / desktop 方案：薄包装 / 与 lobe-ui 重复 / 业务组件。
> 范围：`src/components`（跨业务通用件）与 Lobot 实际路由用到的 `src/features`。原子层一律从 `@lobehub/ui`（含 `/chat`、`/brand`）取（C-01）；输入框从 `@lobehub/editor` 取。弹窗写法见 `modal` skill，组件选择与样式见 `react` skill。
> `src/features` 里还有很多从 LobeHub 带过来、Lobot 没有路由入口的目录（Portal、AgentTasks、ResourceManager、Dashboard、DevPanel…）。**新界面不要从它们取件**；确需复用时先确认它在 Lobot 的某个页面里真的渲染。

## 1. 薄包装：带项目默认值，用包装件

几乎只是透传 lobe-ui，但统一了本项目的默认值。需要同类能力时用包装件；包装件不够时直接用对应的 lobe-ui 件，不要再包一层。

| 包装件                                                | 对应 lobe-ui                            | 注意点                                                                               |
| ----------------------------------------------------- | --------------------------------------- | ------------------------------------------------------------------------------------ |
| `components/BubblesLoading`                           | `LoadingDots`（`/chat`）                | 会话里「正在输入」占位                                                               |
| `components/InfoTooltip`                              | `Tooltip` + `Icon`                      | 字段旁的「?」说明；必要信息不要只放在这里                                            |
| `components/Menu`                                     | `List`                                  | 菜单类列表的默认内边距与文字色；可选中列表传 `selectable`                            |
| `components/EmojiPicker`                              | `EmojiPicker`                           | 懒加载入口（上游数据集很大），带骨架与当前语言；不要直接引上游件                     |
| `components/FileIcon`                                 | `FileTypeIcon` / `MaterialFileTypeIcon` | 按文件名或类型取图标，文件夹也走它                                                   |
| `components/NoticeAlert`                              | `Alert`                                 | 输入框 / 编辑器旁的短通知：一句标题、可选第二行、一个操作；按钮与文字居中对齐        |
| `components/Branding`（`ProductLogo`）                | `LobeHub`（`/brand`）                   | 品牌标识；自定义品牌时自动换成自定义 logo，不直接放 logo 图片                        |
| `components/UserAvatar`、`components/WorkspaceAvatar` | `Avatar`（经项目 `Avatar`）             | 人用像素风兜底、工作区用方形 bauhaus 兜底，和 Agent 的生成角色区分开；按身份选对应件 |

### 包装但改了行为：必须用项目件

| 项目件                     | 改了什么                                     | 何时用                                  |
| -------------------------- | -------------------------------------------- | --------------------------------------- |
| `components/Avatar`        | 图片失效时按名称生成稳定首字母，不出现「UN」 | 所有头像的底座；不要直接用上游 `Avatar` |
| `components/TextArea`      | 失焦或回车时才提交，正确处理中文输入法组字   | 「编辑完再保存」的多行输入              |
| `components/InstantSwitch` | 乐观切换 + 异步保存时 loading                | 切换后立即落库的开关（设置项）          |

## 2. 与 lobe-ui 重复：新代码改用上游

已有引用先不动；新代码和顺手修改的地方改用右列。

| 项目件                              | 改用                                 | 说明                                                                                          |
| ----------------------------------- | ------------------------------------ | --------------------------------------------------------------------------------------------- |
| `components/LiteTable`              | `Table`                              | 自建表格（窄时变卡片），目前只被 Lobot 没有的设置页骨架引用；Lobot 的列表是 IM 行，不需要表格 |
| `features/Channels` 的 `TypingDots` | `LoadingDots`（经 `BubblesLoading`） | 「正在回复」行尾的点；新的输入中提示先用上游件，不再自绘                                      |

## 3. 业务组件：场景 + 注意点

### 窗口外壳与导航

| 组件                                                 | 什么时候用                                     | 注意点                                                                                                      |
| ---------------------------------------------------- | ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `features/Electron/titlebar`                         | 无边框窗口的标题栏、Windows 应用菜单、窗口控件 | 标题栏是拖拽区；新的顶部元素放进它，不另画标题栏，交互元素要退出拖拽区                                      |
| `features/Electron/TabHost`                          | 每个 tab 的独立路由与保活                      | 页面挂在 tab 路由里；不要在根路由再渲染一份页面                                                             |
| `features/NavRail`                                   | 列表栏底部的「消息 / 通讯录」tab 条与紧凑布局  | Lobot 只有这两个 tab；未读角标从会话列表数据算，和列表一致。紧凑判断用 `useCompactLayout`，不自己读窗口宽度 |
| `features/WorkspaceRail`                             | 个人空间与工作区切换                           | 没有工作区的服务端会隐藏；切换后回到当前 tab 的根                                                           |
| `features/NavPanel`（`Shell` / `SideBarLayout`）     | 左侧列表栏的外壳                               | 列表栏由外壳持有、跨会话保持挂载；新列表挂进外壳，不自造侧栏                                                |
| `features/NavHeader`                                 | 内容区页头（含紧凑布局下的返回）               | 紧凑布局的返回由它给出；自带返回的页面（Channel 设置、设置子页）不要再叠一个                                |
| `features/WideScreenContainer`                       | 时间线与输入框的居中限宽                       | 不要再加一层手写 maxWidth                                                                                   |
| `features/DesktopLayoutContainer`                    | 主内容区容器                                   | 页面放进它，圆角与边距由它统一                                                                              |
| `features/HotkeyHelperPanel`、命令面板（`CmdkLazy`） | 快捷键帮助、全局命令                           | 新的全局动作登记进命令面板与快捷键（`hotkey` skill），不另做搜索弹窗                                        |

### 消息 tab 与 Channel

| 组件                                                                                      | 什么时候用                                          | 注意点                                                                                                                                                                                                                                                  |
| ----------------------------------------------------------------------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `features/MessageList`                                                                    | 消息 tab 的会话列表（Lobe AI、私聊、群组、Channel） | 按最新活动排序，Lobe AI 固定第一；每一行都以 Channel 打开                                                                                                                                                                                               |
| `features/Channels`（页面）                                                               | 一个 Channel：时间线 + 输入框 + 右侧栏              | 线程、回复所在话题、成员、外链都在右侧栏打开，窄时浮在会话上；不要为它们新开路由层级                                                                                                                                                                    |
| `Channels` 的 `ChannelMessage`                                                            | 时间线里的一条消息                                  | 正文复用 `features/Conversation` 的 `ChatItem` 与 `Markdown`（C-04）；时间分隔与连续消息合并见 `LOBE-UX-013` / `LOBE-UX-020`                                                                                                                            |
| `Channels` 的 `Composer`                                                                  | Channel / 线程的输入框                              | 基于 `@lobehub/editor`：@ 提及、斜杠命令、附件、粘贴 / 拖入文件、草稿；不另写输入框                                                                                                                                                                     |
| `ReplyActivity`、`ChannelStatus`、`FailureIndicator`、`OutgoingStatus`、`MessageReceipts` | 回复进度、失败、发送状态与回执                      | 进度只在输入框上方一行（`LOBE-UX-008`），失败汇总到页头、消息上只留标记（`LOBE-UX-012`）；不要在每条消息下加状态 chip                                                                                                                                   |
| `ThreadPanel`、`ThreadBrowser`、`ThreadSwitcher`                                          | 线程侧栏、线程列表、切换线程                        | 打开线程只是本地预览，发出第一条消息才创建（`LOBE-UX-007`）                                                                                                                                                                                             |
| `ReplyTopicPanel`、`PortalPanel`                                                          | 回复背后的 Agent 话题、从消息打开的报告 / 网页      | 话题只读；后续追问回到 Channel                                                                                                                                                                                                                          |
| `MemberPanel`、`MemberAvatar`、`MemberProfilePopup`                                       | 成员列表、成员头像、悬停卡片                        | 个人 Channel 页头不显示自己（`LOBE-UX-004`）；悬停卡片是增强，必要操作在点按菜单里也要有                                                                                                                                                                |
| `Channels/CreateChannel`                                                                  | 新建 Channel、邀请成员                              | 新建两步：基本信息（类型、名称、私有，可同时新建项目）→ 成员；邀请成员只有成员步骤，且是唯一入口。Agent 的设备与目录从 Agent 配置继承（`LOBE-UX-002`）。注意 `LOBE-UX-011` 写的是「单个以成员为先的对话框」，与当前代码不一致，改这里前先确认以哪个为准 |
| `Channels/Settings`（含 `FormCard`）                                                      | Channel 设置：常规、成员、回复、危险操作            | 每个设置项一张 `FormCard`：说明与控件在上、提示与提交在底栏；删除走完整生命周期（`LOBE-UX-005`）                                                                                                                                                        |
| `ChannelEmpty`、`ArchivedNotice`、`ChannelSyncing`                                        | 无会话时的空页、已归档提示、本地缓存未确认          | 空页只放淡 logo，不放操作；同步中只在标题旁提示，快速读完不闪                                                                                                                                                                                           |
| `features/EntityLink`                                                                     | 消息里的实体链接（Agent、话题、文件…）              | 能在 Channel 侧栏打开的实体就在侧栏打开                                                                                                                                                                                                                 |

### 通讯录与身份

| 组件                                                                 | 什么时候用                         | 注意点                                                             |
| -------------------------------------------------------------------- | ---------------------------------- | ------------------------------------------------------------------ |
| `features/ContactList`                                               | 通讯录列表栏、联系人卡片、人的卡片 | 点行打开卡片、列表不动；从卡片开始聊天或去编辑资料                 |
| `features/AgentViewAll`                                              | `/agents` 页的 Agent 列表          | 列表视图选项与标签在这里，不另做 Agent 列表                        |
| `features/AddContactModal`                                           | 按用户名或分享链接加人 / Agent     | 唯一的加联系人入口                                                 |
| `features/AgentIdentityModal`                                        | 新建 Agent、改 Agent 身份          | 名称、角色、描述、slug 一处编辑                                    |
| `features/AgentProfileCard`                                          | Agent 资料卡（悬停 / 点开）        | 人用 `MemberProfilePopup` 的人卡片，不混用                         |
| `components/AgentAvatar`、`features/GroupAvatar`、`AgentGroupAvatar` | Agent、群组头像                    | Agent 没有自己的图时由上游生成角色；群组没有自定义头像时拼成员头像 |
| `features/User`（`UserAvatar`、`UserPanel`）                         | 当前用户头像与头像菜单             | 头像进入设置；当前用户头像用它，其他人用 `components/UserAvatar`   |

### 设置与引导

| 组件                         | 什么时候用                                           | 注意点                                                                              |
| ---------------------------- | ---------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `features/Settings`          | 设置页（资料、外观、语言、通知、快捷键、代理、关于） | 新 tab 登记进 `componentMap.desktop.ts` 与设置搜索；按功能开关显示（`LOBE-UX-015`） |
| `features/SettingsSearch`    | 设置搜索                                             | 新设置项要能被搜到（含拼音）                                                        |
| `features/DesktopOnboarding` | 本地首启：欢迎、登录、数据模式、权限、保持唤醒       | 步骤流程在这里扩展，不另开引导窗口                                                  |
| `features/Onboarding`        | 账号引导：称呼、兴趣、回复语言、遥测等               | 与本地首启分开；Electron 在本地设置之后才进入                                       |

### 反馈、错误、加载与弹窗

| 组件                                                                                  | 什么时候用                             | 注意点                                                                           |
| ------------------------------------------------------------------------------------- | -------------------------------------- | -------------------------------------------------------------------------------- |
| `components/AsyncBoundary`、`AsyncError`                                              | 异步区块的加载与失败                   | 按位置选 `page` / `block` / `inline` / `metric`；失败要给重试（K-05）            |
| `components/ErrorBoundary`、`Error`、`404`                                            | 渲染异常兜底、错误通知、找不到页面     | Channel 不存在或无权访问走 `404`                                                 |
| `components/Skeleton`（`RouteSegment`、`Channel`、`NavPanel`、`Settings`、`Delayed`） | 路由级与区块骨架                       | 骨架形状贴近真实布局；短加载用 `Delayed` 避免闪烁；登记方式见 `spa-routes` skill |
| `components/Loading`（`ContentLoading`、`BrandTextLoading`、`CircleLoading`）         | 内容区 / 整页加载                      | 外框已在屏上时用 `ContentLoading`；整页边界才用 `BrandTextLoading`               |
| `components/RingLoading`、`components/ExecutionStatus`                                | 运行中的环形图标、执行状态的图标与颜色 | 只表示「正在运行」；状态图标与颜色从 `ExecutionStatus` 取，不另配                |
| `components/ImperativeModal`、`RenameModal`、`FeedbackModal`、`ChangelogModal`        | 命令式弹窗、重命名、反馈、更新日志     | 新弹窗按 `modal` skill 用 `createModal`                                          |
| `components/MemberSelectionModal`                                                     | 选择成员 / Agent                       | 多选带搜索；Channel 成员选择走 `CreateChannel` 的成员步骤，不用它                |
| `components/CollapsibleContent`                                                       | 长消息、长预览折叠                     | 全局唯一的「展开更多」，高度按视口封顶                                           |
| `components/DragUploadZone`                                                           | 拖拽 / 粘贴上传                        | 输入框的拖入与粘贴复用它的 hooks                                                 |

### 仅桌面系统集成（不渲染界面或只渲染系统级反馈）

`features/Electron`（`ScreenCapture`、`system` 的缩放 HUD / 链接悬停状态、`updater`、`AuthRequiredModal`、`WorkspaceMentionNotifier`）、`Desktop*Bridge`、`Channels/notifications`、`electron/overlay`（截屏浮层，自带样式，不经 `@lobehub/ui` 外壳）。改这些时同时看 `desktop` skill。
