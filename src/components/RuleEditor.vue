<template>
  <t-drawer
    :visible="visible"
    :header="editingRule ? '编辑规则' : '添加规则'"
    @close="$emit('close')"
    @confirm="saveRule"
    size="70%"
    placement="right"
    class="rule-editor-drawer"
  >
    <div class="drawer-content">
      <t-form
        :model="ruleData"
        :rules="formRules"
        label-width="120px"
        ref="formRef"
      >
        <t-form-item label="拦截规则" name="urlPattern" required>
          <t-input
            v-model="ruleData.urlPattern"
            :placeholder="
              ruleData.filterType === 'urlFilter'
                ? '例如: */api/users*'
                : '例如: ^https://api\\.example\\.com/.*'
            "
          >
            <!-- :tips="
              rule.filterType === 'urlFilter'
                ? '支持通配符匹配，如: */api/*，不能包含中文等非ASCII字符'
                : '支持正则表达式，如: ^https://api\\.example\\.com/.*'
            " -->
            <template #prefixIcon>
              <t-select v-model="ruleData.filterType">
                <t-option key="urlFilter" label="URL匹配" value="urlFilter" />
                <t-option
                  key="regexFilter"
                  label="Reg匹配"
                  value="regexFilter"
                />
              </t-select>
              <t-select v-model="ruleData.method">
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
        <t-form-item label="响应体类型">
          <t-radio-group v-model="responseType">
            <t-radio value="json">JSON</t-radio>
            <t-radio value="text">文本</t-radio>
          </t-radio-group>
        </t-form-item>
        <t-form-item label="响应体" name="responseBody">
          <t-textarea
            v-model="responseBodyText"
            :autosize="{ minRows: 6 }"
            :rows="8"
            :placeholder="
              responseType === 'json' ? 'JSON格式的响应体' : '文本响应体'
            "
            @keydown.ctrl.enter="formatJson"
          />
        </t-form-item>
      </t-form>
    </div>
  </t-drawer>
</template>

<script setup lang="ts">
import { reactive, ref, watch } from "vue";
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

const defaultRule = {
  id: "",
  ruleId: -1,
  enabled: true,
  method: "GET",
  urlPattern: "",
  filterType: "urlFilter",
  response: {
    status: 200,
    headers: {},
    body: {},
  },
  expanded: false,
};
// 响应式数据
const ruleData = reactive<RequestRule>(defaultRule);

const responseBodyText = ref("");
const responseType = ref<"json" | "text">("json");
const formRef = ref();

// 监听响应体类型变化
watch(
  responseType,
  (newType, oldType) => {
    if (newType !== oldType && responseBodyText.value) {
      // 切换类型时，如果当前有内容，清空内容以避免格式冲突
      responseBodyText.value = "";
    }
  },
  { immediate: false }
);

// 表单校验规则
const formRules = {
  urlPattern: [
    {
      required: true,
      message: "响应体不能为空",
      trigger: "blur",
    },
    {
      validator: (value: string) => {
        if (!value) return true;

        if (ruleData.filterType === "urlFilter") {
          // URL匹配模式：简单的URL模式匹配，支持通配符
          // 检查是否包含非ASCII字符
          const hasNonAscii = /[^\x00-\x7F]/.test(value);
          if (hasNonAscii) {
            return {
              result: false,
              message:
                "URL模式不能包含中文等非ASCII字符，请使用英文或ASCII字符",
            };
          }

          // URL模式校验通过
          return true;
        } else {
          // 正则表达式模式：严格的正则表达式校验
          try {
            new RegExp(value);
            return true;
          } catch {
            return {
              result: false,
              message: "正则表达式格式错误，请输入有效的正则表达式",
            };
          }
        }
      },
      trigger: "blur",
    },
  ],
  responseBody: [
    {
      required: true,
      message: "响应体不能为空，请输入有效的响应体内容",
      trigger: "blur",
    },
    {
      validator: () => {
        if (responseType.value === "json" && responseBodyText.value) {
          try {
            JSON.parse(responseBodyText.value);
            return true;
          } catch {
            return { result: false, message: "JSON格式错误，请检查响应体格式" };
          }
        }
        return true;
      },
      trigger: "blur",
    },
  ],
};

// 监听编辑规则变化
watch(
  () => props.editingRule,
  (newRule) => {
    if (newRule) {
      Object.assign(ruleData, newRule);

      // 设置过滤类型（如果规则中有filterType则使用，否则默认使用urlFilter）
      if (newRule.filterType) {
        ruleData.filterType = newRule.filterType;
      } else {
        ruleData.filterType = "urlFilter";
      }

      // 处理响应体数据
      if (typeof newRule.response.body === "string") {
        responseType.value = "text";
        responseBodyText.value = newRule.response.body;
      } else if (
        newRule.response.body &&
        typeof newRule.response.body === "object" &&
        Object.keys(newRule.response.body).length > 0
      ) {
        responseType.value = "json";
        responseBodyText.value = JSON.stringify(newRule.response.body, null, 2);
      } else {
        // 处理空对象或其他情况
        responseType.value = "json";
        responseBodyText.value = JSON.stringify(
          { message: "默认响应体" },
          null,
          2
        );
      }
    } else {
      resetForm();
    }
  },
  { immediate: true }
);

// 格式化JSON
const formatJson = () => {
  if (!responseBodyText.value) return;
  try {
    const parsed = JSON.parse(responseBodyText.value);
    responseBodyText.value = JSON.stringify(parsed, null, 2);
  } catch (error) {}
};

// 保存规则
const saveRule = async () => {
  console.log("保存规则");
  try {
    // 执行表单校验
    const result = await formRef.value.validate();
    console.log("表单校验结果:", result);

    // 校验通过，继续保存逻辑
    // 生成唯一ID
    if (!ruleData.id) {
      ruleData.id = `rule_${Date.now()}_${Math.random()
        .toString(36)
        .substring(2, 11)}`;
    }

    // 处理响应体数据
    let responseBody;
    if (responseType.value === "json" && responseBodyText.value) {
      responseBody = JSON.parse(responseBodyText.value);
    } else {
      responseBody = responseBodyText.value;
    }

    // 保存过滤类型信息
    const ruleToSave = {
      ...ruleData,
      response: {
        ...ruleData.response,
        body: responseBody,
      },
    };

    emit("save", ruleToSave);
    resetForm();
  } catch (error) {
    console.log("表单校验失败:", error);
    // 校验失败时，TDesign会自动显示错误信息
  }
};

// 重置表单
const resetForm = () => {
  Object.assign(ruleData, defaultRule);

  responseBodyText.value = "";
  responseType.value = "json";

  // 重置表单校验状态
  if (formRef.value) {
    formRef.value.clearValidate();
  }
};
</script>

<style lang="less" scoped>
.rule-editor-drawer {
  .drawer-content {
    height: 100%;
    display: flex;
    flex-direction: column;
    padding: 0;

    .t-form {
      flex: 1;
      overflow-y: auto;
      padding: 20px;
    }
  }
}
</style>
