<template>
  <div class="page">
    <div class="page-card">
      <div class="toolbar">
        <span class="total-tip">共 {{ list.length }} 道菜品</span>
        <el-button v-if="auth.isAdmin" type="primary" :icon="Plus" @click="openForm()">
          新增菜品
        </el-button>
      </div>

      <el-table :data="list" v-loading="loading" stripe>
        <el-table-column label="图片" width="80">
          <template #default="{ row }">
            <el-image
              v-if="row.image"
              :src="row.image"
              fit="cover"
              style="width: 44px; height: 44px; border-radius: 6px"
            />
            <div v-else class="img-placeholder">{{ row.name.charAt(0) }}</div>
          </template>
        </el-table-column>
        <el-table-column prop="name" label="菜品名" width="140" />
        <el-table-column label="分类" width="110">
          <template #default="{ row }">{{ categoryName(row.categoryId) }}</template>
        </el-table-column>
        <el-table-column label="价格" width="110">
          <template #default="{ row }">
            <span class="amount">¥{{ Number(row.price).toFixed(2) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="description" label="描述" min-width="160" show-overflow-tooltip />
        <el-table-column label="在售" width="90">
          <template #default="{ row }">
            <el-tag :type="row.status === 1 ? 'success' : 'info'" size="small">
              {{ row.status === 1 ? '在售' : '下架' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column v-if="auth.isAdmin" label="操作" width="130" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openForm(row)">编辑</el-button>
            <el-button link type="danger" @click="remove(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 新增/编辑弹窗 -->
    <el-dialog v-model="dialogVisible" :title="form.id ? '编辑菜品' : '新增菜品'" width="480px">
      <el-form :model="form" label-width="80px">
        <el-form-item label="菜品名" required>
          <el-input v-model="form.name" placeholder="如：鱼香肉丝" />
        </el-form-item>
        <el-form-item label="分类" required>
          <el-select v-model="form.categoryId" placeholder="选择分类" style="width: 100%">
            <el-option v-for="c in categories" :key="c.id" :label="c.name" :value="c.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="价格" required>
          <el-input-number v-model="form.price" :min="0.01" :precision="2" :step="1" />
        </el-form-item>
        <el-form-item label="图片URL">
          <el-input v-model="form.image" placeholder="https://...（后端无上传接口，填外部图片地址）" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="form.description" type="textarea" :rows="2" placeholder="菜品简介（选填）" />
        </el-form-item>
        <el-form-item label="在售">
          <el-switch v-model="form.status" :active-value="1" :inactive-value="0" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="save">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { getDishes, addDish, updateDish, deleteDish, getCategories } from '../api/modules'
import { useAuthStore } from '../store/auth'

const auth = useAuthStore()
const list = ref([])
const categories = ref([])
const loading = ref(false)

const dialogVisible = ref(false)
const saving = ref(false)
const form = reactive({ id: null, name: '', categoryId: null, price: null, image: '', description: '', status: 1 })

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
  if (row) {
    Object.assign(form, row)
  } else {
    Object.assign(form, { id: null, name: '', categoryId: null, price: null, image: '', description: '', status: 1 })
  }
  dialogVisible.value = true
}

const save = async () => {
  if (!form.name || !form.categoryId || form.price == null) {
    ElMessage.warning('请填写完整：菜品名、分类、价格')
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
.total-tip {
  color: #909399;
  font-size: 14px;
}

.img-placeholder {
  width: 44px;
  height: 44px;
  border-radius: 6px;
  background: linear-gradient(135deg, #ffb199, #ff0844);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
}
</style>
