<template>
  <t-drawer
    :visible="visible"
    size="70%"
    placement="right"
    @close="handleClose"
    @confirm="handleSubmit"
  >
    <div class="rule-editor">
      <t-form
        ref="formRef"
        :data="formData"
        :rules="formRules"
        label-align="top"
      >
        <!-- 基础信息 -->
        <div class="section">
          <t-form-item label="拦截规则" name="urlPattern" required>
            <t-input
              v-model="formData.urlPattern"
              :placeholder="
                formData.filterType === 'urlFilter'
                  ? '请输入URL关键词（如：api/user）'
                  : '请输入正则表达式（如：.*api.*）'
              "
            >
              <!-- :tips="
              rule.filterType === 'urlFilter'
                ? '支持通配符匹配，如: */api/*，不能包含中文等非ASCII字符'
                : '支持正则表达式，如: ^https://api\\.example\\.com/.*'
            " -->
              <template #prefixIcon>
                <t-select
                  v-model="formData.filterType"
                  class="filter-type-select"
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
        </div>

        <!-- 请求和响应修改 -->
        <div class="section">
          <div class="section-title">请求和响应修改</div>

          <t-tabs v-model="activeTab" theme="card">
            <!-- 返回体 -->
            <t-tab-panel value="responseBody" label="返回体">
              <div class="tab-content">
                <div class="form-row">
                  <t-form-item label="响应体类型" name="response.bodyType">
                    <t-radio-group v-model="formData.response.bodyType">
                      <t-radio value="json">JSON数据</t-radio>
                      <t-radio value="function">JavaScript函数</t-radio>
                    </t-radio-group>
                  </t-form-item>
                </div>
                <div class="form-row">
                  <t-form-item
                    :label="
                      formData.response.bodyType === 'json'
                        ? '响应体'
                        : 'JavaScript函数'
                    "
                    name="response.body"
                  >
                    <t-textarea
                      v-model="formData.responseBodyJson"
                      :placeholder="
                        formData.response.bodyType === 'json'
                          ? '请输入JSON格式的响应体'
                          : '请输入JavaScript函数'
                      "
                      :autosize="{
                        minRows: 6,
                        maxRows: 12,
                      }"
                    />
                  </t-form-item>
                </div>
              </div>
            </t-tab-panel>
            <!-- 返回头 -->
            <t-tab-panel value="responseHeader" label="返回头">
              <div class="tab-content">
                <div class="form-row">
                  <t-form-item label="状态码" name="response.status">
                    <t-input-number
                      v-model="formData.response.status"
                      :min="100"
                      :max="599"
                      placeholder="请输入HTTP状态码"
                    />
                  </t-form-item>
                </div>
                <div class="form-row">
                  <t-form-item label="响应头" name="response.headers">
                    <t-textarea
                      v-model="formData.responseHeadersJson"
                      placeholder='请输入JSON格式的响应头，如：{"Content-Type": "application/json", "Cache-Control": "no-cache"}'
                      :autosize="{ minRows: 3, maxRows: 6 }"
                    />
                  </t-form-item>
                </div>
              </div>
            </t-tab-panel>
            <!-- 请求头 -->
            <t-tab-panel value="requestHeaders" label="请求头">
              <div class="tab-content">
                <t-form-item label="请求头修改" name="requestHeaders">
                  <t-textarea
                    v-model="formData.requestHeadersJson"
                    placeholder='请输入JSON格式的请求头，如：{"Content-Type": "application/json", "Authorization": "Bearer token"}'
                    :autosize="{ minRows: 8, maxRows: 12 }"
                  />
                </t-form-item>
              </div>
            </t-tab-panel>

            <!-- 请求体 -->
            <t-tab-panel value="requestBody" label="请求体">
              <div class="tab-content">
                <t-form-item label="请求体修改" name="requestBody">
                  <t-textarea
                    v-model="formData.requestBodyJson"
                    placeholder='请输入JSON格式的请求体修改，如：{"userId": 123, "status": "active"}'
                    :autosize="{ minRows: 8, maxRows: 12 }"
                  />
                </t-form-item>
              </div>
            </t-tab-panel>
          </t-tabs>
        </div>
      </t-form>
    </div>
  </t-drawer>
</template>

<script setup lang="ts">
import { MessagePlugin } from "tdesign-vue-next";
import { reactive, ref, watch, nextTick } from "vue";
import { RequestRule } from "@/types";

interface Props {
  visible: boolean;
  editingRule?: RequestRule | null;
}

interface Emits {
  (e: "save", rule: RequestRule): void;
  (e: "close"): void;
}

const props = defineProps<Props>();
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
    bodyType: "json" as "json" | "function",
  },
  responseHeadersJson: "{}",
  responseBodyJson: "{}",
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
            formData.responseBodyJson = JSON.stringify(
              rule.response?.body || {},
              null,
              2
            );
          } else {
            formData.responseBodyJson = rule.response?.body || "";
          }
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
  });
};

// 处理表单提交
const handleSubmit = async () => {
  const result = await formRef.value.validate();
  if (result === true) {
    try {
      // 解析JSON数据
      const requestHeaders = parseJson(formData.requestHeadersJson, "请求头");
      const requestBody = parseJson(formData.requestBodyJson, "请求体");
      const responseHeaders = parseJson(formData.responseHeadersJson, "响应头");

      let responseBody: any;
      if (formData.response.bodyType === "json") {
        responseBody = parseJson(formData.responseBodyJson, "响应体");
      } else {
        responseBody = formData.responseBodyJson;
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
.rule-editor {
  height: 100%;
  display: flex;
  flex-direction: column;

  .filter-type-select {
    width: 100px;
  }
  .filter-method-select {
    width: 100px;
  }
  .t-input--prefix {
    padding: 0;
  }

  .section {
    margin-bottom: 24px;
    padding: 16px;
    background: #fafafa;
    border-radius: 6px;

    .section-title {
      font-size: 14px;
      font-weight: 600;
      color: #333;
      margin-bottom: 16px;
      padding-bottom: 8px;
      border-bottom: 1px solid #e8e8e8;
    }

    .form-row {
      margin-bottom: 16px;

      &:last-child {
        margin-bottom: 0;
      }

      .t-form-item {
        margin-bottom: 0;

        :deep(.t-form__label) {
          font-weight: 500;
          color: #333;
        }
      }
    }
  }

  .action-buttons {
    display: flex;
    gap: 12px;
    justify-content: flex-end;
    padding: 16px 0;
    border-top: 1px solid #e8e8e8;
    margin-top: 24px;

    .t-button {
      min-width: 80px;
    }
  }

  .tab-content {
    padding: 16px 0;

    .form-row {
      margin-bottom: 16px;

      &:last-child {
        margin-bottom: 0;
      }

      .t-form-item {
        margin-bottom: 0;

        :deep(.t-form__label) {
          font-weight: 500;
          color: #333;
        }
      }
    }
  }

  :deep(.t-tabs__content) {
    padding: 0;
  }

  :deep(.t-tabs__nav-item) {
    padding: 8px 16px;
  }
}
</style>
