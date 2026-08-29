<template>
  <div class="page ai-profile-page">
    <PageHeader
      title="AI 菜品手册"
      subtitle="维护菜系、口味、配料、过敏原与招牌排序，作为 AI 推荐的唯一菜品依据"
    />

    <section class="safety-banner" aria-label="资料安全提示">
      <span class="safety-icon" aria-hidden="true">!</span>
      <div>
        <strong>过敏原必须由人工核对</strong>
        <p>只有“已验证”且在售的菜品会进入 AI 菜品手册；确认无已知过敏原时请明确填写 NONE。</p>
      </div>
    </section>

    <section class="metrics" aria-label="手册概况">
      <article>
        <span>全部菜品</span>
        <strong>{{ rows.length }}</strong>
      </article>
      <article>
        <span>已验证</span>
        <strong>{{ verifiedCount }}</strong>
      </article>
      <article>
        <span>待完善</span>
        <strong>{{ rows.length - verifiedCount }}</strong>
      </article>
      <article>
        <span>招牌菜</span>
        <strong>{{ signatureCount }}</strong>
      </article>
    </section>

    <section class="page-card catalog-panel" aria-labelledby="catalog-title">
      <div class="catalog-toolbar">
        <div>
          <p class="panel-kicker">AI CATALOG</p>
          <h2 id="catalog-title">菜品资料</h2>
        </div>
        <div class="filters">
          <label>
            <span class="sr-only">搜索菜品</span>
            <input v-model="keyword" type="search" placeholder="搜索菜品或菜系…" />
          </label>
          <label>
            <span class="sr-only">筛选资料状态</span>
            <select v-model="statusFilter">
              <option value="ALL">全部状态</option>
              <option value="VERIFIED">已验证</option>
              <option value="INCOMPLETE">待完善</option>
              <option value="UNCONFIGURED">未配置</option>
            </select>
          </label>
        </div>
      </div>

      <p v-if="loading" class="loading-state" role="status">正在读取菜品手册…</p>
      <div v-else-if="filteredRows.length" class="profile-grid">
        <article v-for="row in filteredRows" :key="row.id" class="profile-card">
          <div class="profile-heading">
            <div>
              <p>菜品 #{{ row.id }}</p>
              <h3>{{ row.name }}</h3>
            </div>
            <span class="status-pill" :class="statusClass(row.profileStatus)">
              {{ statusLabel(row.profileStatus) }}
            </span>
          </div>

          <dl class="profile-facts">
            <div>
              <dt>菜系</dt>
              <dd>{{ row.cuisine || '待填写' }}</dd>
            </div>
            <div>
              <dt>口味</dt>
              <dd>{{ row.tasteTags || '待填写' }}</dd>
            </div>
            <div>
              <dt>辣度</dt>
              <dd>{{ row.spicyLevel == null ? '待填写' : `${row.spicyLevel} / 5` }}</dd>
            </div>
            <div>
              <dt>过敏原</dt>
              <dd :class="{ warning: !row.allergens }">{{ row.allergens || '未明确' }}</dd>
            </div>
          </dl>

          <div class="profile-footer">
            <span v-if="row.isSignature" class="signature-badge">
              招牌第 {{ row.signatureRank || '-' }} 名
            </span>
            <span v-else class="ordinary-badge">普通菜品</span>
            <button
              type="button"
              class="edit-button"
              :data-testid="`edit-profile-${row.id}`"
              @click="openEditor(row)"
            >
              {{ row.profileStatus ? '编辑资料' : '开始配置' }}
            </button>
          </div>
        </article>
      </div>
      <p v-else class="empty-state">没有符合条件的菜品</p>
    </section>

    <el-drawer
      v-model="editorVisible"
      :title="editingDish ? `配置：${editingDish.name}` : '配置 AI 菜品资料'"
      size="min(620px, 100%)"
      append-to-body
      destroy-on-close
    >
      <form class="profile-form" @submit.prevent="save">
        <section class="form-section" aria-labelledby="status-section-title">
          <div class="form-heading">
            <div>
              <p>01 · 审核状态</p>
              <h3 id="status-section-title">资料是否可以用于推荐</h3>
            </div>
          </div>
          <label class="field full">
            <span>资料状态</span>
            <select v-model="form.profileStatus" name="profileStatus">
              <option value="INCOMPLETE">待完善——不会用于 AI 推荐</option>
              <option value="VERIFIED">已验证——允许用于 AI 推荐</option>
            </select>
          </label>
        </section>

        <section class="form-section" aria-labelledby="flavor-section-title">
          <div class="form-heading">
            <div>
              <p>02 · 风味资料</p>
              <h3 id="flavor-section-title">帮助 AI 理解菜品口味</h3>
            </div>
          </div>
          <div class="field-grid">
            <label class="field">
              <span>菜系</span>
              <input v-model.trim="form.cuisine" name="cuisine" placeholder="如：川菜" />
            </label>
            <label class="field">
              <span>辣度（0–5）</span>
              <input
                v-model.number="form.spicyLevel"
                name="spicyLevel"
                type="number"
                min="0"
                max="5"
                step="1"
              />
            </label>
            <label class="field full">
              <span>口味标签</span>
              <input
                v-model.trim="form.tasteTags"
                name="tasteTags"
                placeholder="逗号分隔，如：麻辣,鲜香,下饭"
              />
            </label>
            <label class="field full">
              <span>主要配料</span>
              <textarea
                v-model.trim="form.ingredients"
                name="ingredients"
                rows="2"
                placeholder="逗号分隔，如：牛肉,辣椒,花椒"
              />
            </label>
            <label class="field full critical-field">
              <span>过敏原 <strong>必须明确</strong></span>
              <input
                v-model.trim="form.allergens"
                name="allergens"
                placeholder="如：花生,大豆；无已知过敏原请填 NONE"
              />
              <small>请勿猜测。标记为已验证前必须经过人工核对。</small>
            </label>
            <label class="field full">
              <span>饮食标签</span>
              <input
                v-model.trim="form.dietaryTags"
                name="dietaryTags"
                placeholder="可选，如：素食,低脂"
              />
            </label>
          </div>
        </section>

        <section class="form-section" aria-labelledby="recommend-section-title">
          <div class="form-heading">
            <div>
              <p>03 · 推荐规则</p>
              <h3 id="recommend-section-title">控制推荐说明与招牌排序</h3>
            </div>
          </div>
          <div class="field-grid">
            <label class="field full">
              <span>推荐说明</span>
              <textarea
                v-model.trim="form.recommendationNotes"
                name="recommendationNotes"
                rows="3"
                placeholder="如：适合喜欢麻辣口味、2人用餐的顾客"
              />
            </label>
            <label class="field">
              <span>建议用餐人数</span>
              <input
                v-model.number="form.servingPeople"
                name="servingPeople"
                type="number"
                min="1"
                step="1"
              />
            </label>
            <label class="check-field">
              <input v-model="form.isSignature" name="isSignature" type="checkbox" />
              <span>设为本店招牌菜</span>
            </label>
            <label v-if="form.isSignature" class="field">
              <span>招牌排名</span>
              <input
                v-model.number="form.signatureRank"
                name="signatureRank"
                type="number"
                min="1"
                step="1"
              />
            </label>
          </div>
        </section>

        <p v-if="formError" class="form-error" role="alert">{{ formError }}</p>

        <div class="drawer-actions">
          <button type="button" class="cancel-button" @click="editorVisible = false">取消</button>
          <button type="submit" class="save-button" :disabled="saving">
            {{ saving ? '正在保存…' : '保存资料' }}
          </button>
        </div>
      </form>
    </el-drawer>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { getDishes } from '../api/modules'
import { getDishAiProfiles, saveDishAiProfile } from '../api/dishAiProfiles'
import PageHeader from '../components/PageHeader.vue'

const loading = ref(false)
const saving = ref(false)
const dishes = ref([])
const profiles = ref([])
const keyword = ref('')
const statusFilter = ref('ALL')
const editorVisible = ref(false)
const editingDish = ref(null)
const formError = ref('')

const blankProfile = () => ({
  cuisine: '',
  tasteTags: '',
  spicyLevel: null,
  ingredients: '',
  allergens: '',
  dietaryTags: '',
  isSignature: false,
  signatureRank: null,
  recommendationNotes: '',
  servingPeople: null,
  profileStatus: 'INCOMPLETE',
})
const form = reactive(blankProfile())

const rows = computed(() => {
  const profileMap = new Map(profiles.value.map((profile) => [Number(profile.dishId), profile]))
  return dishes.value.map((dish) => ({ ...dish, ...(profileMap.get(Number(dish.id)) || {}) }))
})

const verifiedCount = computed(
  () => rows.value.filter((row) => row.profileStatus === 'VERIFIED').length,
)
const signatureCount = computed(
  () => rows.value.filter((row) => row.profileStatus === 'VERIFIED' && row.isSignature).length,
)
const filteredRows = computed(() => {
  const search = keyword.value.trim().toLowerCase()
  return rows.value.filter((row) => {
    const rowStatus = row.profileStatus || 'UNCONFIGURED'
    const matchesStatus = statusFilter.value === 'ALL' || rowStatus === statusFilter.value
    const matchesSearch =
      !search ||
      `${row.name} ${row.cuisine || ''} ${row.tasteTags || ''}`.toLowerCase().includes(search)
    return matchesStatus && matchesSearch
  })
})

const statusLabel = (status) => ({ VERIFIED: '已验证', INCOMPLETE: '待完善' })[status] || '未配置'
const statusClass = (status) =>
  ({ VERIFIED: 'verified', INCOMPLETE: 'incomplete' })[status] || 'unconfigured'

const load = async () => {
  loading.value = true
  try {
    const [dishList, profileList] = await Promise.all([getDishes(), getDishAiProfiles()])
    dishes.value = dishList || []
    profiles.value = profileList || []
  } finally {
    loading.value = false
  }
}

const openEditor = (row) => {
  editingDish.value = row
  formError.value = ''
  Object.assign(form, blankProfile(), {
    cuisine: row.cuisine || '',
    tasteTags: row.tasteTags || '',
    spicyLevel: row.spicyLevel ?? null,
    ingredients: row.ingredients || '',
    allergens: row.allergens || '',
    dietaryTags: row.dietaryTags || '',
    isSignature: Boolean(row.isSignature),
    signatureRank: row.signatureRank ?? null,
    recommendationNotes: row.recommendationNotes || '',
    servingPeople: row.servingPeople ?? null,
    profileStatus: row.profileStatus || 'INCOMPLETE',
  })
  editorVisible.value = true
}

const validate = () => {
  if (form.profileStatus !== 'VERIFIED') return ''
  if (!form.cuisine) return '标记为已验证前，请填写菜系'
  if (!form.tasteTags) return '标记为已验证前，请填写口味标签'
  if (!Number.isInteger(form.spicyLevel) || form.spicyLevel < 0 || form.spicyLevel > 5) {
    return '辣度必须是 0 到 5 的整数'
  }
  if (!form.ingredients) return '标记为已验证前，请填写主要配料'
  if (!form.allergens) return '标记为已验证前必须明确过敏原；无已知过敏原请填写 NONE'
  if (!form.recommendationNotes) return '标记为已验证前，请填写推荐说明'
  if (!Number.isInteger(form.servingPeople) || form.servingPeople < 1) {
    return '建议用餐人数必须是大于 0 的整数'
  }
  if (form.isSignature && (!Number.isInteger(form.signatureRank) || form.signatureRank < 1)) {
    return '招牌菜必须填写大于 0 的招牌排名'
  }
  return ''
}

const save = async () => {
  formError.value = validate()
  if (formError.value || !editingDish.value) return
  saving.value = true
  try {
    const payload = {
      cuisine: form.cuisine,
      tasteTags: form.tasteTags,
      spicyLevel: form.spicyLevel,
      ingredients: form.ingredients,
      allergens: form.allergens,
      dietaryTags: form.dietaryTags,
      isSignature: form.isSignature,
      signatureRank: form.isSignature ? form.signatureRank : null,
      recommendationNotes: form.recommendationNotes,
      servingPeople: form.servingPeople,
      profileStatus: form.profileStatus,
    }
    await saveDishAiProfile(editingDish.value.id, payload)
    ElMessage.success('AI 菜品资料已保存')
    editorVisible.value = false
    await load()
  } catch (error) {
    formError.value = error?.message || '保存失败，请检查填写内容后重试'
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.ai-profile-page {
  max-width: 1440px;
  margin-inline: auto;
}

.safety-banner {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  padding: 14px 16px;
  border: 1px solid rgb(148 89 21 / 18%);
  border-radius: var(--radius-lg);
  background: rgb(255 246 229 / 78%);
  color: var(--status-warning);
}

.safety-icon {
  display: grid;
  flex: 0 0 38px;
  width: 38px;
  height: 38px;
  border-radius: var(--radius-md);
  background: rgb(148 89 21 / 12%);
  font-size: 18px;
  font-weight: 900;
  place-items: center;
}

.safety-banner strong {
  font-size: 13px;
}

.safety-banner p {
  margin-top: 2px;
  color: var(--text-sub);
  font-size: 11px;
}

.metrics {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.metrics article {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 18px;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  background: var(--surface);
  box-shadow: var(--shadow-card);
}

.metrics span {
  color: var(--text-sub);
  font-size: 12px;
}

.metrics strong {
  color: var(--brand-dark);
  font-size: 24px;
  font-variant-numeric: tabular-nums;
}

.catalog-toolbar {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
}

.catalog-toolbar h2 {
  margin-top: 3px;
  font-size: 19px;
}

.filters {
  display: flex;
  gap: 8px;
}

.filters input,
.filters select,
.field input,
.field select,
.field textarea {
  width: 100%;
  min-height: var(--tap-target-min);
  padding: 9px 11px;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  background: var(--surface-strong);
  color: var(--text-main);
  font: inherit;
}

.filters input {
  width: min(260px, 32vw);
}

.loading-state,
.empty-state {
  padding: 60px 20px;
  color: var(--text-sub);
  text-align: center;
}

.profile-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.profile-card {
  display: flex;
  flex-direction: column;
  min-width: 0;
  padding: 16px;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  background: #fff;
}

.profile-heading,
.profile-footer {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.profile-heading p {
  color: var(--text-muted);
  font-size: 9px;
  letter-spacing: 1px;
}

.profile-heading h3 {
  margin-top: 3px;
  font-size: 16px;
}

.status-pill,
.signature-badge,
.ordinary-badge {
  flex: 0 0 auto;
  padding: 4px 8px;
  border-radius: var(--radius-xl);
  font-size: 10px;
  font-weight: 800;
}

.status-pill.verified {
  background: rgb(47 116 85 / 10%);
  color: var(--status-success);
}

.status-pill.incomplete {
  background: rgb(148 89 21 / 10%);
  color: var(--status-warning);
}

.status-pill.unconfigured {
  background: rgb(116 109 103 / 10%);
  color: var(--status-neutral);
}

.profile-facts {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-block: 16px;
}

.profile-facts div {
  min-width: 0;
  padding: 9px 10px;
  border-radius: var(--radius-sm);
  background: #fbf7f3;
}

.profile-facts dt {
  color: var(--text-muted);
  font-size: 9px;
}

.profile-facts dd {
  overflow: hidden;
  margin-top: 3px;
  font-size: 11px;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.profile-facts dd.warning {
  color: var(--status-danger);
}

.profile-footer {
  align-items: center;
  margin-top: auto;
  padding-top: 12px;
  border-top: 1px solid var(--border-subtle);
}

.signature-badge {
  background: var(--brand-light);
  color: var(--brand-dark);
}

.ordinary-badge {
  color: var(--text-muted);
}

.edit-button,
.save-button,
.cancel-button {
  min-height: var(--tap-target-min);
  padding: 8px 14px;
  border-radius: var(--radius-xl);
  font: inherit;
  font-size: 12px;
  font-weight: 800;
}

.edit-button,
.save-button {
  border: 0;
  background: var(--brand-dark);
  color: #fff;
}

.profile-form {
  padding-bottom: 90px;
}

.form-section {
  margin-bottom: 16px;
  padding: 16px;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  background: var(--surface);
}

.form-heading {
  margin-bottom: 14px;
}

.form-heading p {
  color: var(--brand-dark);
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 1.4px;
}

.form-heading h3 {
  margin-top: 3px;
  font-size: 15px;
}

.field-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 13px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  color: var(--text-sub);
  font-size: 11px;
  font-weight: 700;
}

.field.full {
  grid-column: 1 / -1;
}

.field textarea {
  resize: vertical;
  line-height: 1.5;
}

.field small {
  color: var(--status-warning);
  font-weight: 500;
}

.critical-field {
  padding: 11px;
  border: 1px solid rgb(148 89 21 / 18%);
  border-radius: var(--radius-md);
  background: rgb(255 246 229 / 52%);
}

.critical-field strong {
  color: var(--status-danger);
}

.check-field {
  display: flex;
  align-items: center;
  gap: 9px;
  min-height: var(--tap-target-min);
  color: var(--text-main);
  font-size: 12px;
  font-weight: 700;
}

.check-field input {
  width: 20px;
  height: 20px;
  accent-color: var(--brand-dark);
}

.form-error {
  margin-bottom: 14px;
  padding: 11px 13px;
  border-radius: var(--radius-md);
  background: rgb(184 62 56 / 9%);
  color: var(--status-danger);
  font-size: 12px;
}

.drawer-actions {
  position: sticky;
  bottom: -20px;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 14px 0 20px;
  background: linear-gradient(transparent, var(--surface) 18%);
}

.cancel-button {
  border: 1px solid var(--border-subtle);
  background: var(--surface);
  color: var(--text-main);
}

.save-button:disabled {
  opacity: 0.55;
}

@media (max-width: 1100px) {
  .profile-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 768px) {
  .metrics {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .catalog-toolbar,
  .filters {
    align-items: stretch;
    flex-direction: column;
  }

  .filters input {
    width: 100%;
  }

  .profile-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 520px) {
  .field-grid {
    grid-template-columns: 1fr;
  }

  .field.full {
    grid-column: auto;
  }
}
</style>
