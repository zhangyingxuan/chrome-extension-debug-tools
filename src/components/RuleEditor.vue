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
        :model="rule"
        :rules="formRules"
        label-width="120px"
        ref="formRef"
      >
        <t-form-item label="拦截规则" name="urlPattern" required>
          <t-input
            v-model="rule.urlPattern"
            :placeholder="
              rule.filterType === 'urlFilter'
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
              <t-select v-model="rule.filterType">
                <t-option key="urlFilter" label="URL匹配" value="urlFilter" />
                <t-option
                  key="regexFilter"
                  label="Reg匹配"
                  value="regexFilter"
                />
              </t-select>
              <t-select v-model="rule.method">
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
import { ref, watch } from "vue";
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
const rule = ref<RequestRule>(defaultRule);

const responseBodyText = ref("");
const responseType = ref<"json" | "text">("json");
const formRef = ref();

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

        if (rule.value.filterType === "urlFilter") {
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
      message: "URL模式不能为空，请输入有效的URL模式",
      trigger: "blur",
    },
    {
      validator: () => {
        if (responseType.value === "json" && responseBodyText.value) {
          try {
            console.log(JSON.parse(responseBodyText.value));
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
      rule.value = JSON.parse(JSON.stringify(newRule));

      // 设置过滤类型（如果规则中有filterType则使用，否则默认使用urlFilter）
      if (newRule.filterType) {
        rule.value.filterType = newRule.filterType;
      } else {
        rule.value.filterType = "urlFilter";
      }

      if (typeof newRule.response.body === "string") {
        responseType.value = "text";
        responseBodyText.value = newRule.response.body;
      } else {
        responseType.value = "json";
        responseBodyText.value = JSON.stringify(newRule.response.body, null, 2);
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
  const result = await formRef.value.validate();

  if (typeof result === "boolean" && result === true) {
    // 校验通过，继续保存逻辑
    // 生成唯一ID
    if (!rule.value.id) {
      rule.value.id = `rule_${Date.now()}_${Math.random()
        .toString(36)
        .substring(2, 11)}`;
    }

    // 保存过滤类型信息
    const ruleToSave = {
      ...rule.value,
    };

    emit("save", ruleToSave);
    resetForm();
  }
  // 如果校验失败，TDesign会自动显示错误信息，无需额外处理
};

// 重置表单
const resetForm = () => {
  rule.value = defaultRule;

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
