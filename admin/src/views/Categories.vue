<template>
  <div class="page">
    <PageHeader title="分类管理" subtitle="组织菜单结构，并控制分类排序与启停状态">
      <template #actions>
        <el-button type="primary" :icon="Plus" @click="openForm()">新增分类</el-button>
      </template>
    </PageHeader>

    <section class="page-card entity-panel" aria-labelledby="category-list-title">
      <div class="toolbar">
        <div class="list-summary">
          <span class="summary-icon" aria-hidden="true"
            ><el-icon><CollectionTag /></el-icon
          ></span>
          <div>
            <p class="panel-kicker">MENU CATEGORIES</p>
            <h2 id="category-list-title">分类列表</h2>
            <span>共 {{ list.length }} 个分类</span>
          </div>
        </div>
        <el-tag type="success" effect="plain" round>
          启用 {{ list.filter((item) => item.status === 1).length }} 个
        </el-tag>
      </div>

      <div class="table-shell category-table-shell">
        <el-table :data="list" v-loading="loading" stripe>
          <el-table-column prop="id" label="ID" width="80">
            <template #default="{ row }">
              <span class="entity-id">#{{ row.id }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="name" label="分类名" min-width="180">
            <template #default="{ row }">
              <strong>{{ row.name }}</strong>
            </template>
          </el-table-column>
          <el-table-column label="类型" width="120">
            <template #default="{ row }">
              <el-tag :type="row.type === 1 ? 'primary' : 'warning'" size="small" round>
                {{ row.type === 1 ? '菜品' : '套餐' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="sort" label="排序" width="100" />
          <el-table-column label="状态" width="110">
            <template #default="{ row }">
              <el-tag :type="row.status === 1 ? 'success' : 'info'" size="small" round>
                {{ row.status === 1 ? '启用' : '停用' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="140" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" @click="openForm(row)">编辑</el-button>
              <el-button link type="danger" @click="remove(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </section>

    <el-dialog
      v-model="dialogVisible"
      :title="form.id ? '编辑分类' : '新增分类'"
      width="min(460px, calc(100% - 24px))"
      append-to-body
    >
      <el-form :model="form" label-position="top" class="entity-form">
        <el-form-item label="类型" for="category-type" required>
          <el-radio-group
            id="category-type"
            v-model="form.type"
            name="categoryType"
            aria-label="分类类型"
          >
            <el-radio :value="1">菜品</el-radio>
            <el-radio :value="2">套餐</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="分类名" for="category-name" required>
          <el-input
            ref="categoryNameInput"
            id="category-name"
            v-model="form.name"
            name="categoryName"
            autocomplete="off"
            placeholder="如：热菜…"
            aria-describedby="category-form-error"
            :aria-invalid="Boolean(formError)"
            @input="formError = ''"
          />
        </el-form-item>
        <el-form-item label="排序" for="category-sort">
          <el-input-number
            id="category-sort"
            v-model="form.sort"
            name="categorySort"
            :min="0"
            inputmode="numeric"
            aria-label="分类排序"
            class="full-control"
          />
        </el-form-item>
        <el-form-item label="状态" for="category-status">
          <el-switch
            id="category-status"
            v-model="form.status"
            name="categoryStatus"
            :active-value="1"
            :inactive-value="0"
            active-text="启用"
            inactive-text="停用"
            aria-label="分类启用状态"
          />
        </el-form-item>
        <p v-if="formError" id="category-form-error" class="form-error" role="alert">
          {{ formError }}
        </p>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="save">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { nextTick, ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, CollectionTag } from '@element-plus/icons-vue'
import { getCategories, addCategory, updateCategory, deleteCategory } from '../api/modules'
import PageHeader from '../components/PageHeader.vue'

const list = ref([])
const loading = ref(false)
const dialogVisible = ref(false)
const saving = ref(false)
const formError = ref('')
const categoryNameInput = ref(null)
const form = reactive({ id: null, type: 1, name: '', sort: 0, status: 1 })

const load = async () => {
  loading.value = true
  try {
    list.value = (await getCategories()) || []
  } catch {
    // 拦截器已提示
  } finally {
    loading.value = false
  }
}

const openForm = (row) => {
  formError.value = ''
  if (row) {
    Object.assign(form, row)
  } else {
    Object.assign(form, { id: null, type: 1, name: '', sort: 0, status: 1 })
  }
  dialogVisible.value = true
}

const save = async () => {
  formError.value = ''
  if (!form.name) {
    formError.value = '请输入分类名'
    ElMessage.warning('请输入分类名')
    nextTick(() => categoryNameInput.value?.focus())
    return
  }
  saving.value = true
  try {
    if (form.id) {
      await updateCategory(form)
    } else {
      await addCategory(form)
    }
    ElMessage.success('保存成功')
    dialogVisible.value = false
    load()
  } catch {
    // 拦截器已提示
    formError.value = '保存失败，请检查填写内容后重试'
  } finally {
    saving.value = false
  }
}

const remove = async (row) => {
  await ElMessageBox.confirm(`确定要删除「${row.name}」吗？`, '提示', { type: 'warning' })
  try {
    await deleteCategory(row.id)
    ElMessage.success('删除成功')
    load()
  } catch {
    // 拦截器已提示
  }
}

onMounted(load)
</script>

<style scoped>
.entity-panel {
  border-radius: var(--radius-lg);
}

.list-summary {
  display: flex;
  align-items: center;
  gap: 12px;
}

.summary-icon {
  display: grid;
  flex: 0 0 44px;
  width: 44px;
  height: 44px;
  border-radius: var(--radius-md);
  background: var(--brand-light);
  color: var(--brand-dark);
  font-size: 20px;
  place-items: center;
}

.list-summary h2 {
  margin-top: 2px;
  color: var(--text-main);
  font-size: 17px;
}

.list-summary div > span {
  color: var(--text-sub);
  font-size: 11px;
}

.category-table-shell {
  --table-min-width: 720px;
}

.entity-id {
  color: var(--text-sub);
  font-variant-numeric: tabular-nums;
}

.full-control {
  width: 100%;
}

.form-error {
  padding: 10px 12px;
  border-radius: var(--radius-sm);
  background: rgb(210 74 67 / 8%);
  color: var(--status-danger);
  font-size: 12px;
}

@media (max-width: 768px) {
  .toolbar {
    align-items: flex-start;
  }
}
</style>
