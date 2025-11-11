<template>
  <div class="rule-item" :class="{ disabled: !rule.enabled }">
    <div class="rule-info">
      <div class="rule-header">
        <t-switch
          v-model="rule.enabled"
          size="small"
          @change="$emit('update', rule)"
        />
        <span class="rule-id">{{ rule.id }}</span>
        <span class="rule-method">{{ rule.method }}</span>
        <span class="rule-url">{{ rule.urlPattern }}</span>
        <span v-if="rule.delay > 0" class="rule-delay">
          延迟: {{ rule.delay }}ms
        </span>
      </div>
      <div class="rule-response">
        响应: {{ rule.response.status }} -
        {{ truncate(rule.response.body) }}
      </div>
    </div>
    <div class="rule-actions">
      <t-button size="small" @click="$emit('edit', rule)">编辑</t-button>
      <t-popconfirm
        content="确定要删除这条拦截规则吗？"
        @confirm="$emit('delete', rule.id)"
      >
        <t-button size="small" theme="danger">删除</t-button>
      </t-popconfirm>
    </div>
  </div>
</template>

<script setup lang="ts">
import { watch } from "vue";
import { RequestRule } from "../types";

interface Props {
  rule: RequestRule;
}

interface Emits {
  (e: "update", rule: RequestRule): void;
  (e: "edit", rule: RequestRule): void;
  (e: "delete", ruleId: string): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

// 监听规则变化
watch(
  () => props.rule,
  (newRule: any) => {
    console.log("规则项已更新:", newRule.id, newRule.urlPattern);
  },
  { deep: true }
);

// 截断长文本
const truncate = (value: any) => {
  if (typeof value === "string") {
    const length = value.length;
    return length > 50 ? value.substring(0, 50) + "..." : value;
  }
  const str = JSON.stringify(value);
  const length = str.length;
  return length > 50 ? str.substring(0, 50) + "..." : str;
};
</script>

<style lang="less" scoped>
.rule-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  border: 1px solid #f0f0f0;
  border-radius: 4px;
  margin-bottom: 4px;
  background: #fff;
  transition: all 0.2s;

  &:hover {
    border-color: #d9d9d9;
    background: #fafafa;
  }

  &:last-child {
    margin-bottom: 0;
  }

  &.disabled {
    opacity: 0.6;
    background: #f5f5f5;
  }

  .rule-info {
    flex: 1;
    min-width: 0;

    .rule-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 4px;
      flex-wrap: wrap;

      .rule-id {
        font-size: 11px;
        color: #666;
        background: #f0f0f0;
        padding: 1px 4px;
        border-radius: 2px;
        font-family: monospace;
      }

      .rule-method {
        padding: 1px 6px;
        background: #1890ff;
        color: white;
        border-radius: 2px;
        font-size: 11px;
        font-weight: 500;
        min-width: 36px;
        text-align: center;
      }

      .rule-url {
        font-family: monospace;
        font-size: 12px;
        color: #333;
        flex: 1;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .rule-delay {
        font-size: 11px;
        color: #fa8c16;
        background: #fff7e6;
        padding: 1px 4px;
        border-radius: 2px;
      }
    }

    .rule-response {
      font-size: 11px;
      color: #666;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }

  .rule-actions {
    display: flex;
    gap: 6px;
    flex-shrink: 0;
  }
}

@media (max-width: 768px) {
  .rule-item {
    padding: 6px 8px;
    flex-direction: column;
    gap: 8px;
    align-items: stretch;

    .rule-info {
      .rule-header {
        gap: 6px;

        .rule-url {
          font-size: 11px;
        }
      }
    }

    .rule-actions {
      justify-content: flex-end;
    }
  }
}
</style>
