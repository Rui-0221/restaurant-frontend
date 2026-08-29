<template>
  <div class="page">
    <PageHeader title="菜品管理" subtitle="维护菜品信息、售价、分类与在售状态">
      <template #actions>
        <el-button v-if="auth.isAdmin" type="primary" :icon="Plus" @click="openForm()">
          新增菜品
        </el-button>
      </template>
    </PageHeader>

    <section class="page-card entity-panel" aria-labelledby="dish-list-title">
      <div class="toolbar">
        <div class="list-summary">
          <span class="summary-icon" aria-hidden="true"
            ><el-icon><Dish /></el-icon
          ></span>
          <div>
            <p class="panel-kicker">MENU ITEMS</p>
            <h2 id="dish-list-title">菜品列表</h2>
            <span>共 {{ list.length }} 道菜品</span>
          </div>
        </div>
        <el-tag type="success" effect="plain" round>
          在售 {{ list.filter((item) => item.status === 1).length }} 道
        </el-tag>
      </div>

      <div class="table-shell dish-table-shell">
        <el-table :data="list" v-loading="loading" stripe>
          <el-table-column label="图片" width="88">
            <template #default="{ row }">
              <div
                class="dish-thumb"
                :role="row.image ? undefined : 'img'"
                :aria-label="row.image ? undefined : `${row.name}暂无图片`"
              >
                <span class="img-placeholder" aria-hidden="true">{{ row.name.charAt(0) }}</span>
                <img
                  v-if="row.image"
                  class="dish-image"
                  :src="row.image"
                  :alt="`${row.name}图片`"
                  width="48"
                  height="48"
                  loading="lazy"
                  decoding="async"
                  @error="$event.currentTarget.classList.add('is-error')"
                />
              </div>
            </template>
          </el-table-column>
          <el-table-column prop="name" label="菜品名" width="150">
            <template #default="{ row }">
              <strong class="dish-name">{{ row.name }}</strong>
            </template>
          </el-table-column>
          <el-table-column label="分类" width="120">
            <template #default="{ row }">
              <el-tag type="info" effect="plain" round>{{ categoryName(row.categoryId) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="价格" width="130">
            <template #default="{ row }">
              <MoneyValue class="amount" :amount="row.price" />
            </template>
          </el-table-column>
          <el-table-column prop="description" label="描述" min-width="190" show-overflow-tooltip />
          <el-table-column label="在售" width="100">
            <template #default="{ row }">
              <el-tag :type="row.status === 1 ? 'success' : 'info'" size="small" round>
                {{ row.status === 1 ? '在售' : '下架' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column v-if="auth.isAdmin" label="操作" width="140" fixed="right">
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
      :title="form.id ? '编辑菜品' : '新增菜品'"
      width="min(520px, calc(100% - 24px))"
      append-to-body
    >
      <el-form :model="form" label-position="top" class="entity-form">
        <el-form-item label="菜品名" for="dish-name" required>
          <el-input
            ref="dishNameInput"
            id="dish-name"
            v-model="form.name"
            name="dishName"
            autocomplete="off"
            placeholder="如：鱼香肉丝…"
            aria-describedby="dish-form-error"
            :aria-invalid="Boolean(formError && !form.name)"
            @input="formError = ''"
          />
        </el-form-item>
        <el-form-item label="分类" for="dish-category" required>
          <el-select
            ref="dishCategoryInput"
            id="dish-category"
            v-model="form.categoryId"
            name="dishCategory"
            aria-label="菜品分类"
            aria-describedby="dish-form-error"
            :aria-invalid="Boolean(formError && !form.categoryId)"
            placeholder="请选择分类…"
            class="full-control"
          >
            <el-option v-for="c in categories" :key="c.id" :label="c.name" :value="c.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="价格" for="dish-price" required>
          <el-input-number
            ref="dishPriceInput"
            id="dish-price"
            v-model="form.price"
            name="dishPrice"
            :min="0.01"
            :precision="2"
            :step="1"
            inputmode="decimal"
            aria-label="菜品价格"
            aria-describedby="dish-form-error"
            :aria-invalid="Boolean(formError && form.price == null)"
            class="full-control"
          />
        </el-form-item>
        <el-form-item label="图片 URL" for="dish-image">
          <el-input
            id="dish-image"
            v-model="form.image"
            name="dishImage"
            type="url"
            autocomplete="url"
            inputmode="url"
            placeholder="如：https://example.com/dish.jpg…"
          />
        </el-form-item>
        <el-form-item label="描述" for="dish-description">
          <el-input
            id="dish-description"
            v-model="form.description"
            name="dishDescription"
            type="textarea"
            autocomplete="off"
            :rows="3"
            maxlength="500"
            show-word-limit
            placeholder="请输入菜品简介（选填）…"
          />
        </el-form-item>
        <el-form-item label="在售状态" for="dish-status">
          <el-switch
            id="dish-status"
            v-model="form.status"
            name="dishStatus"
            :active-value="1"
            :inactive-value="0"
            active-text="在售"
            inactive-text="下架"
            aria-label="菜品在售状态"
          />
        </el-form-item>
        <p v-if="formError" id="dish-form-error" class="form-error" role="alert">
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
import { Plus, Dish } from '@element-plus/icons-vue'
import { getDishes, addDish, updateDish, deleteDish, getCategories } from '../api/modules'
import { useAuthStore } from '../store/auth'
import PageHeader from '../components/PageHeader.vue'
import MoneyValue from '../components/MoneyValue.vue'

const auth = useAuthStore()
const list = ref([])
const categories = ref([])
const loading = ref(false)

const dialogVisible = ref(false)
const saving = ref(false)
const formError = ref('')
const dishNameInput = ref(null)
const dishCategoryInput = ref(null)
const dishPriceInput = ref(null)
const form = reactive({
  id: null,
  name: '',
  categoryId: null,
  price: null,
  image: '',
  description: '',
  status: 1,
})

const categoryName = (id) => categories.value.find((c) => c.id === id)?.name || '-'

const load = async () => {
  loading.value = true
  try {
    const [dishList, catList] = await Promise.all([getDishes(), getCategories()])
    list.value = dishList || []
    categories.value = catList || []
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
    Object.assign(form, {
      id: null,
      name: '',
      categoryId: null,
      price: null,
      image: '',
      description: '',
      status: 1,
    })
  }
  dialogVisible.value = true
}

const save = async () => {
  formError.value = ''
  if (!form.name || !form.categoryId || form.price == null) {
    formError.value = '请填写菜品名、分类和价格'
    ElMessage.warning('请填写完整：菜品名、分类、价格')
    nextTick(() => {
      const firstInvalid = !form.name
        ? dishNameInput.value
        : !form.categoryId
          ? dishCategoryInput.value
          : dishPriceInput.value
      firstInvalid?.focus()
    })
    return
  }
  saving.value = true
  try {
    if (form.id) {
      await updateDish(form)
    } else {
      await addDish(form)
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
    await deleteDish(row.id)
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

.dish-table-shell {
  --table-min-width: 900px;
}

.dish-thumb {
  position: relative;
  display: grid;
  width: 48px;
  height: 48px;
  overflow: hidden;
  border-radius: var(--radius-md);
  place-items: center;
}

.img-placeholder {
  display: grid;
  width: 100%;
  height: 100%;
  background: linear-gradient(145deg, var(--brand-dark), var(--brand-active));
  color: #fff;
  font-size: 18px;
  font-weight: 800;
  place-items: center;
}

.dish-image {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.dish-image.is-error {
  opacity: 0;
}

.dish-name {
  color: var(--text-main);
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
