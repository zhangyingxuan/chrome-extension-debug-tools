<template>
  <t-dialog
    :visible="visible"
    :header="editingGroup ? '编辑分组' : '添加分组'"
    @close="$emit('close')"
    width="400px"
  >
    <t-form :model="{ name: groupName }" label-width="80px">
      <t-form-item label="分组名称" required>
        <t-input
          v-model="groupName"
          placeholder="请输入分组名称"
          maxlength="20"
        />
      </t-form-item>
    </t-form>

    <template #footer>
      <t-button @click="$emit('close')">取消</t-button>
      <t-button theme="primary" @click="saveGroup">保存</t-button>
    </template>
  </t-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import { RuleGroup } from "../types";

interface Props {
  visible: boolean;
  editingGroup?: RuleGroup | null;
}

interface Emits {
  (e: "save", group: RuleGroup): void;
  (e: "close"): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const groupName = ref("");

// 监听编辑分组变化
watch(
  () => props.editingGroup,
  (newGroup) => {
    if (newGroup) {
      groupName.value = newGroup.name;
    } else {
      groupName.value = "";
    }
  },
  { immediate: true }
);

// 保存分组
const saveGroup = () => {
  console.log("GroupManager: 开始保存分组");

  if (!groupName.value.trim()) {
    alert("请输入分组名称");
    return;
  }

  const group: RuleGroup = {
    id:
      props.editingGroup?.id ||
      `group_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
    name: groupName.value.trim(),
    enabled: props.editingGroup?.enabled ?? true,
    expanded: props.editingGroup?.expanded ?? true,
    // order字段由父组件根据当前分组数量设置
    order: 1,
  };

  console.log("GroupManager: 准备触发save事件", group);
  emit("save", group);
  console.log("GroupManager: save事件已触发");
  // 不重置表单，让父组件处理对话框关闭
};

// 重置表单
const resetForm = () => {
  groupName.value = "";
};
</script>
