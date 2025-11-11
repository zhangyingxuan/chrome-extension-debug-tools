<template>
  <div class="group-item" :class="{ disabled: !group.enabled }">
    <div class="group-header">
      <div class="group-info">
        <t-switch
          v-model="group.enabled"
          size="small"
          @change="$emit('update', group)"
        />
        <t-button
          size="small"
          variant="text"
          @click="$emit('toggle-expand', group)"
          class="expand-btn"
        >
          <t-icon :name="group.expanded ? 'chevron-down' : 'chevron-right'" />
          {{ group.name }}
        </t-button>
        <span class="group-rule-count"> ({{ ruleCount }} 条规则) </span>
      </div>
      <div class="group-actions">
        <t-button
          theme="primary"
          size="small"
          @click="$emit('add-rule', group.id)"
        >
          添加规则
        </t-button>
        <t-button size="small" @click="$emit('edit', group)">编辑</t-button>
        <t-popconfirm
          content="确定要删除这个分组吗？分组内的规则将移动到默认分组"
          @confirm="$emit('delete', group.id)"
        >
          <t-button size="small" theme="danger">删除</t-button>
        </t-popconfirm>
      </div>
    </div>

    <!-- 分组内的规则列表 -->
    <div v-show="group.expanded" class="group-rules">
      <RuleItem
        v-for="rule in rules"
        :key="rule.id"
        :rule="rule"
        @update="$emit('rule-update', $event)"
        @edit="$emit('rule-edit', $event)"
        @delete="$emit('rule-delete', $event)"
      />

      <div v-if="rules.length === 0" class="empty-group">该分组暂无规则</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, watch } from "vue";
import { RuleGroup, RequestRule } from "../types";
import RuleItem from "./RuleItem.vue";

interface Props {
  group: RuleGroup;
  rules: RequestRule[];
}

interface Emits {
  (e: "update", group: RuleGroup): void;
  (e: "toggle-expand", group: RuleGroup): void;
  (e: "add-rule", groupId: string): void;
  (e: "edit", group: RuleGroup): void;
  (e: "delete", groupId: string): void;
  (e: "rule-update", rule: RequestRule): void;
  (e: "rule-edit", rule: RequestRule): void;
  (e: "rule-delete", ruleId: string): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const ruleCount = computed(() => {
  console.log(`分组 ${props.group.name} 的规则数量:`, props.rules.length);
  return props.rules.length;
});

// 监听规则变化
watch(
  () => props.rules,
  (newRules) => {
    console.log(`分组 ${props.group.name} 规则列表已更新:`, newRules.length);
  },
  { deep: true }
);
</script>

<style lang="less" scoped>
.group-item {
  margin-bottom: 16px;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  background: #fff;
  transition: all 0.3s;

  &:hover {
    border-color: #d9d9d9;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  &.disabled {
    opacity: 0.6;
    background: #fafafa;
  }

  .group-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    background: #fafafa;
    border-bottom: 1px solid #e8e8e8;
    border-radius: 8px 8px 0 0;

    .group-info {
      display: flex;
      align-items: center;
      gap: 12px;
      flex: 1;

      .expand-btn {
        display: flex;
        align-items: center;
        gap: 8px;
        font-weight: 500;
        color: #333;
        transition: color 0.3s;

        &:hover {
          color: #1890ff;
        }
      }

      .group-rule-count {
        font-size: 12px;
        color: #666;
        margin-left: 8px;
      }
    }

    .group-actions {
      display: flex;
      gap: 8px;
      flex-shrink: 0;
    }
  }

  .group-rules {
    padding: 8px;
    animation: slideDown 0.3s ease-out;

    .empty-group {
      text-align: center;
      padding: 20px;
      color: #999;
      font-size: 13px;
      background: #fafafa;
      border-radius: 4px;
    }
  }
}

// 展开收起动画
@keyframes slideDown {
  from {
    opacity: 0;
    max-height: 0;
  }
  to {
    opacity: 1;
    max-height: 500px;
  }
}

@media (max-width: 768px) {
  .group-item {
    margin-bottom: 12px;

    .group-header {
      padding: 8px 12px;
      flex-direction: column;
      gap: 8px;
      align-items: stretch;

      .group-info {
        justify-content: space-between;
      }

      .group-actions {
        justify-content: flex-end;
      }
    }

    .group-rules {
      padding: 4px;
    }
  }
}
</style>
