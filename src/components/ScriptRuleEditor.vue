<template>
  <t-drawer
    :visible="visible"
    :size="wide ? '70%' : '560px'"
    :placement="'right'"
    @close="handleClose"
    :class="['rule-editor-drawer', wide ? 'dock-bottom' : '']"
  >
    <template #header>
      <div class="editor-header">
        <span class="editor-title">{{ editingRule ? "编辑规则" : "添加规则" }}</span>
        <div class="header-actions" v-if="wide">
          <t-button variant="text" theme="default" @click="handleClose">
            取消
          </t-button>
          <t-button theme="primary" @click="handleSubmit">
            保存规则
          </t-button>
        </div>
      </div>
    </template>

    <div class="drawer-content">
      <t-form
        ref="formRef"
        :data="formData"
        :rules="formRules"
        label-align="top"
      >
        <!-- 请求匹配 -->
        <section class="card">
          <h4 class="card-title">请求匹配</h4>
          <t-form-item label="拦截规则" name="urlPattern" required class="field">
            <t-input
              v-model="formData.urlPattern"
              class="url-input"
              :placeholder="
                formData.filterType === 'urlFilter'
                  ? '请输入URL关键词（如：api/user）'
                  : '请输入正则表达式（如：.*api.*）'
              "
            >
              <template #prefixIcon>
                <t-select
                  v-model="formData.filterType"
                  class="filter-type-select"
                  size="small"
                >
                  <t-option key="urlFilter" label="URL匹配" value="urlFilter" />
                  <t-option
                    key="regexFilter"
                    label="Reg匹配"
                    value="regexFilter"
                  />
                </t-select>
                <t-select
                  v-model="formData.method"
                  class="filter-method-select"
                  size="small"
                >
                  <t-option label="所有方法" value="ALL" />
                  <t-option label="GET" value="GET" />
                  <t-option label="POST" value="POST" />
                  <t-option label="PUT" value="PUT" />
                  <t-option label="DELETE" value="DELETE" />
                  <t-option label="PATCH" value="PATCH" />
                  <t-option label="OPTIONS" value="OPTIONS" />
                  <t-option label="HEAD" value="HEAD" />
                </t-select>
              </template>
            </t-input>
          </t-form-item>
        </section>

        <!-- 请求与响应修改 -->
        <section class="card grow">
          <h4 class="card-title">请求 / 响应修改</h4>
          <t-tabs v-model="activeTab" class="editor-tabs">
            <t-tab-panel value="responseBody" label="返回体">
              <div class="tab-content">
                <div class="form-row">
                  <t-form-item label="">
                    <t-switch
                      v-model="formData.enableResponseBody"
                      :label="['启用', '禁用']"
                    />
                  </t-form-item>
                  <t-form-item label="" name="response.bodyType">
                    <t-select
                      v-model="formData.response.bodyType"
                      class="filter-type-select"
                      size="small"
                      :disabled="!formData.enableResponseBody"
                    >
                      <t-option key="json" label="JSON" value="json" />
                    </t-select>
                  </t-form-item>
                </div>
                <t-form-item label="" name="response.body" class="tab-grow">
                  <t-textarea
                    v-model="formData.responseBodyJson"
                    class="code-textarea body-area"
                    :placeholder="'请输入JSON格式的响应体'"
                    :autosize="{
                      minRows: wide ? 4 : 9,
                      maxRows: wide ? 12 : 40,
                    }"
                    :disabled="!formData.enableResponseBody"
                  />
                </t-form-item>
              </div>
            </t-tab-panel>
            <!-- 返回头 -->
            <t-tab-panel value="responseHeader" label="返回头">
              <div class="tab-content">
                <div class="form-row">
                  <t-form-item label="">
                    <t-switch
                      v-model="formData.enableResponseHeaders"
                      :label="['启用', '禁用']"
                    />
                  </t-form-item>
                  <t-form-item label="" name="response.status">
                    <t-input-number
                      v-model="formData.response.status"
                      :min="100"
                      :max="599"
                      placeholder="HTTP 状态码"
                      class="status-input"
                    />
                  </t-form-item>
                  <t-form-item label="">
                    <t-switch
                      v-model="formData.enableStatusCode"
                      :label="['状态码生效', '忽略状态码']"
                      size="small"
                    />
                  </t-form-item>
                </div>
                <t-form-item label="" name="response.headers" class="tab-grow">
                  <t-textarea
                    v-model="formData.responseHeadersJson"
                    class="code-textarea body-area"
                    placeholder='如：{"Content-Type":"application/json","Cache-Control":"no-cache"}'
                    :autosize="{
                      minRows: wide ? 4 : 9,
                      maxRows: wide ? 12 : 40,
                    }"
                    :disabled="!formData.enableResponseHeaders"
                  />
                </t-form-item>
              </div>
            </t-tab-panel>
            <!-- 请求头 -->
            <t-tab-panel value="requestHeaders" label="请求头">
              <div class="tab-content">
                <div class="form-row">
                  <t-form-item label="">
                    <t-switch
                      v-model="formData.enableRequestHeaders"
                      :label="['启用', '禁用']"
                    />
                  </t-form-item>
                </div>
                <t-form-item label="" name="requestHeaders" class="tab-grow">
                  <t-textarea
                    v-model="formData.requestHeadersJson"
                    class="code-textarea body-area"
                    placeholder='如：{"Content-Type":"application/json","Authorization":"Bearer token"}'
                    :autosize="{
                      minRows: wide ? 4 : 9,
                      maxRows: wide ? 12 : 40,
                    }"
                    :disabled="!formData.enableRequestHeaders"
                  />
                </t-form-item>
              </div>
            </t-tab-panel>

            <!-- 请求体 -->
            <t-tab-panel value="requestBody" label="请求体">
              <div class="tab-content">
                <div class="form-row">
                  <t-form-item label="">
                    <t-switch
                      v-model="formData.enableRequestBody"
                      :label="['启用', '禁用']"
                    />
                  </t-form-item>
                </div>
                <t-form-item label="" name="requestBody" class="tab-grow">
                  <t-textarea
                    v-model="formData.requestBodyJson"
                    class="code-textarea body-area"
                    placeholder='请输入JSON格式的请求体修改，如：{"userId":123,"status":"active"}'
                    :autosize="{
                      minRows: wide ? 4 : 9,
                      maxRows: wide ? 12 : 40,
                    }"
                    :disabled="!formData.enableRequestBody"
                  />
                </t-form-item>
              </div>
            </t-tab-panel>
          </t-tabs>
        </section>
      </t-form>
    </div>

    <template #footer>
      <div class="editor-footer">
        <t-button variant="text" theme="default" @click="handleClose">
          取消
        </t-button>
        <t-button theme="primary" @click="handleSubmit">
          保存规则
        </t-button>
      </div>
    </template>
  </t-drawer>
</template><script setup lang="ts">
import { MessagePlugin } from "tdesign-vue-next";
import { reactive, ref, watch, nextTick } from "vue";
import { RequestRule } from "@/types";

interface Props {
  visible: boolean;
  editingRule?: RequestRule | null;
  wide?: boolean;
}

interface Emits {
  (e: "save", rule: RequestRule): void;
  (e: "close"): void;
}

const props = withDefaults(defineProps<Props>(), { wide: false });
const emit = defineEmits<Emits>();

const formRef = ref();
const activeTab = ref("responseBody");

// 表单数据
const formData = reactive({
  filterType: "urlFilter" as "urlFilter" | "regexFilter",
  urlPattern: "",
  method: "GET",
  requestHeadersJson: "{}",
  requestBodyJson: "{}",
  response: {
    status: 200,
    headers: {},
    body: {},
    bodyType: "json" as "json",
  },
  responseHeadersJson: "{}",
  responseBodyJson: "{}",
  // 各部分拦截开关
  enableRequestBody: false,
  enableRequestHeaders: false,
  enableResponseBody: true,
  enableResponseHeaders: false,
  enableStatusCode: false,
});

// 表单验证规则
const formRules = {
  urlPattern: [
    { required: true, message: "请输入URL模式", trigger: "blur" },
    {
      validator: (value: string) => {
        if (formData.filterType === "regexFilter") {
          try {
            new RegExp(value);
            return true;
          } catch {
            return false;
          }
        }
        return true;
      },
      message: "正则表达式格式错误",
      trigger: "blur",
    },
  ],
  method: [{ required: true, message: "请选择请求方法", trigger: "change" }],
  "response.status": [
    { required: true, message: "请输入状态码", trigger: "blur" },
    {
      type: "number",
      min: 100,
      max: 599,
      message: "状态码必须在100-599之间",
      trigger: "blur",
    },
  ],
  "response.body": [
    {
      validator: (value: string) => {
        if (formData.response.bodyType === "json") {
          try {
            JSON.parse(formData.responseBodyJson);
            return true;
          } catch {
            return false;
          }
        }
        return true;
      },
      message: "JSON格式错误",
      trigger: "blur",
    },
  ],
};

// 监听visible变化，初始化表单数据
watch(
  () => props.visible,
  (visible) => {
    if (visible) {
      nextTick(() => {
        activeTab.value = "responseBody";
        if (props.editingRule) {
          // 编辑模式：填充现有规则数据
          const rule = props.editingRule;
          formData.filterType = rule.filterType || "urlFilter";
          formData.urlPattern = rule.urlPattern || "";
          formData.method = rule.method || "GET";
          formData.requestHeadersJson = JSON.stringify(
            rule.requestHeaders || {},
            null,
            2
          );
          formData.requestBodyJson = JSON.stringify(
            rule.requestBody || {},
            null,
            2
          );
          formData.response.status = rule.response?.status || 200;
          formData.responseHeadersJson = JSON.stringify(
            rule.response?.headers || {},
            null,
            2
          );
          formData.response.bodyType = rule.response?.bodyType || "json";

          if (formData.response.bodyType === "json") {
            let body = rule.response?.body;
            if (typeof rule.response.body === "string") {
              body = JSON.parse(body || "{}");
            }
            // 处理响应体数据
            formData.responseBodyJson = JSON.stringify(body || {}, null, 2);
          } else {
            formData.responseBodyJson = rule.response?.body || "";
          }

          // 加载开关状态
          formData.enableRequestBody = rule.enableRequestBody ?? false;
          formData.enableRequestHeaders = rule.enableRequestHeaders ?? false;
          formData.enableResponseBody = rule.enableResponseBody ?? true;
          formData.enableResponseHeaders = rule.enableResponseHeaders ?? false;
          formData.enableStatusCode = rule.enableStatusCode ?? false;
        } else {
          // 添加模式：重置表单
          resetForm();
        }
      });
    }
  }
);

// 重置表单
const resetForm = () => {
  Object.assign(formData, {
    name: "",
    filterType: "urlFilter",
    urlPattern: "",
    method: "GET",
    requestHeadersJson: "{}",
    requestBodyJson: "{}",
    response: {
      status: 200,
      headers: {},
      body: {},
      bodyType: "json",
    },
    responseHeadersJson: "{}",
    responseBodyJson: "{}",
    // 重置开关状态
    enableRequestBody: false,
    enableRequestHeaders: false,
    enableResponseBody: true,
    enableResponseHeaders: false,
    enableStatusCode: false,
  });
};

// 处理表单提交
const handleSubmit = async () => {
  const result = await formRef.value.validate();
  if (result === true) {
    try {
      // 解析JSON数据，根据开关状态决定是否应用
      const requestHeaders = formData.enableRequestHeaders
        ? parseJson(formData.requestHeadersJson, "请求头")
        : {};
      const requestBody = formData.enableRequestBody
        ? parseJson(formData.requestBodyJson, "请求体")
        : {};
      const responseHeaders = formData.enableResponseHeaders
        ? parseJson(formData.responseHeadersJson, "响应头")
        : {};

      let responseBody: any;
      if (formData.enableResponseBody) {
        if (formData.response.bodyType === "json") {
          responseBody = parseJson(formData.responseBodyJson, "响应体");
        } else {
          responseBody = formData.responseBodyJson;
        }
      } else {
        responseBody = {};
      }

      // 构建规则对象
      const rule: RequestRule = {
        id: props.editingRule?.id,
        ruleId: props.editingRule?.ruleId || Date.now(),
        enabled: props.editingRule?.enabled ?? true,
        filterType: formData.filterType,
        urlPattern: formData.urlPattern,
        method: formData.method,
        requestHeaders,
        requestBody,
        response: {
          status: formData.response.status,
          headers: responseHeaders,
          body: responseBody,
          bodyType: formData.response.bodyType,
        },
        expanded: props.editingRule?.expanded ?? false,
        // 保存开关状态
        enableRequestBody: formData.enableRequestBody,
        enableRequestHeaders: formData.enableRequestHeaders,
        enableResponseBody: formData.enableResponseBody,
        enableResponseHeaders: formData.enableResponseHeaders,
        enableStatusCode: formData.enableStatusCode,
      };

      emit("save", rule);
      MessagePlugin.success(
        props.editingRule ? "规则更新成功" : "规则添加成功"
      );
    } catch (error) {
      MessagePlugin.error(error instanceof Error ? error.message : "保存失败");
    }
  }
};

// 解析JSON数据
const parseJson = (jsonStr: string, fieldName: string): any => {
  if (!jsonStr.trim()) return {};

  try {
    const parsed = JSON.parse(jsonStr);
    if (typeof parsed !== "object" || parsed === null) {
      throw new Error(`${fieldName}必须是有效的JSON对象`);
    }
    return parsed;
  } catch (error) {
    throw new Error(
      `${fieldName}格式错误：${
        error instanceof Error ? error.message : "未知错误"
      }`
    );
  }
};

// 处理关闭
const handleClose = () => {
  emit("close");
};
</script>


<style lang="less" scoped>
@primary: #2f6fed;
@bg: #f5f6f8;
@surface: #ffffff;
@border: #e4e7ec;
@text: #1f2633;
@subtext: #5b6472;
@mono: "SFMono-Regular", "JetBrains Mono", Consolas, "Liberation Mono", Menlo, monospace;

.rule-editor-drawer {
  .editor-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    gap: 8px;

    .editor-title {
      font-size: 13px;
      font-weight: 600;
      color: @text;
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-left: auto;

      :deep(.t-button) {
        height: 26px;
        padding: 0 10px;
        font-size: 12px;
        border-radius: 6px;
      }
    }
  }

  .drawer-content {
    display: flex;
    flex-direction: column;
    min-height: 0;

    .t-form {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 12px;
      overflow-y: auto;
      min-height: 0;

      .card {
        background: @surface;
        border: 1px solid @border;
        border-radius: 8px;
        padding: 14px;
        box-shadow: 0 1px 2px rgba(16, 24, 40, 0.04);

        &.grow {
          flex: 1;
          display: flex;
          flex-direction: column;
          margin-bottom: 0;
          :deep(.t-form__controls) {
            flex: 1;
            display: flex;
            .t-form__controls-content {
              flex: 1;
              display: flex;
              flex-direction: column;
              .editor-tabs {
                flex: 1;
                display: flex;
                flex-direction: column;
              }
              :deep(.t-tabs__content) {
                flex: 1;
                display: flex;
                flex-direction: column;
              }
              .tab-content {
                flex: 1;
                display: flex;
                flex-direction: column;
                .tab-grow {
                  flex: 1;
                  display: flex;
                  flex-direction: column;
                  margin-bottom: 0;
                  :deep(.t-form__controls) {
                    flex: 1;
                    display: flex;
                    .t-form__controls-content {
                      flex: 1;
                      display: flex;
                      .t-textarea {
                        flex: 1;
                        textarea {
                          flex: 1;
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }

        .card-title {
          margin: 0 0 10px;
          font-size: 12px;
          font-weight: 600;
          color: @text;
          letter-spacing: 0.2px;
          display: flex;
          align-items: center;
          gap: 6px;
          &::before {
            content: "";
            width: 3px;
            height: 12px;
            border-radius: 2px;
            background: @primary;
          }
        }

        :deep(.t-form__label) {
          font-size: 11.5px;
          color: @subtext;
          font-weight: 500;
          margin-bottom: 4px;
          line-height: 1.2;
        }
        :deep(.t-form__item) {
          margin-bottom: 10px;
          &:last-child {
            margin-bottom: 0;
          }
        }
      }
    }

    .url-input {
      :deep(input) {
        font-family: @mono;
        font-size: 12px;
      }
    }
    .code-textarea {
      :deep(textarea) {
        font-family: @mono;
        font-size: 12px;
        line-height: 1.55;
        background: #fbfcfe;
      }
    }

    .filter-type-select {
      width: 88px;
    }
    .filter-method-select {
      width: 84px;
    }
    .status-input {
      width: 140px;
    }
    .form-row {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 10px;
      :deep(.t-form__item) {
        margin-bottom: 0;
      }
    }
    .editor-tabs {
      :deep(.t-tabs__nav-item) {
        padding: 6px 12px;
      }
      :deep(.t-tabs__content) {
        padding: 10px 0 0;
      }
    }
    .t-input--prefix {
      padding: 0;
    }
  }

  .editor-footer {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 8px;
    width: 100%;

    :deep(.t-button) {
      border-radius: 6px;
    }
  }

  // 底部停靠：抽屉更高(72%)、砍掉 header、footer 压缩
  &.dock-bottom {
    .drawer-content {
      .t-form {
        display: grid;
        grid-template-columns: 1fr 1fr;
        grid-template-rows: auto minmax(min-content, 1fr);
        gap: 4px 8px;
        overflow-x: hidden;
        overflow-y: auto;
        min-height: 0;

        .card {
          padding: 6px 8px;
          box-shadow: none;

          &:first-child {
            grid-column: 1 / -1;
          }
          &:nth-child(2) {
            grid-column: 1 / -1;
          }

          .card-title {
            margin-bottom: 2px;
            font-size: 10.5px;
          }
          :deep(.t-form__label) {
            margin-bottom: 1px;
            font-size: 10.5px;
          }
          :deep(.t-form__item) {
            margin-bottom: 2px;
          }
          :deep(.t-tabs__nav-item) {
            padding: 4px 10px;
          }
          :deep(.t-tabs__content) {
            padding: 6px 0 0;
          }
          .tab-content {
            .form-row {
              margin-bottom: 4px;
            }
          }
        }
      }
    }

    .editor-footer {
      :deep(.t-button) {
        height: 30px;
        padding: 0 12px;
        font-size: 12px;
      }
    }
  }
}
</style>

<style lang="less">
/* 非 scoped：TDesign Drawer 通过 Teleport 渲染到 body，
   root 节点无 data-v 属性，scoped /deep/ 无法命中。 */
.rule-editor-drawer {
  .t-drawer__header {
    padding: 12px 16px;
    min-height: 0;
    border-bottom: 1px solid #e4e7ec;
  }
  .t-drawer__body {
    padding: 14px 16px;
    background: #f5f6f8;
  }
  .t-drawer__footer {
    padding: 8px 16px;
    border-top: 1px solid #e4e7ec;
    background: #ffffff;
  }

  &.dock-bottom {
    .t-drawer__header {
      padding: 6px 12px;
    }
    .t-drawer__body {
      padding: 8px 12px;
    }
    .t-drawer__footer {
      display: none;
    }
  }
}
</style>
