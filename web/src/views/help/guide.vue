<template>
  <div class="guide-page page-container">
    <div class="page-header">
      <div>
        <h2 class="page-title">操作说明</h2>
      </div>
    </div>

    <a-row :gutter="[18, 18]">
      <a-col :xs="24" :xl="12">
        <a-card :bordered="false" class="guide-card">
          <template #title>员工提单</template>
          <a-steps direction="vertical" size="small" :current="-1">
            <a-step title="拍票识别" description="进入拍票识别上传发票。" />
            <a-step title="发票夹" description="在我的发票夹确认可用发票。" />
            <a-step title="新建报销" description="带发票创建或补录报销单。" />
            <a-step title="提交审批" description="保存草稿或直接提交审批。" />
            <a-step title="跟踪状态" description="在我的报销查看审批和付款进度。" />
          </a-steps>
        </a-card>
      </a-col>

      <a-col :xs="24" :xl="12">
        <a-card :bordered="false" class="guide-card">
          <template #title>审批处理</template>
          <a-steps direction="vertical" size="small" :current="-1">
            <a-step title="进入待我审批" description="查看当前待办列表。" />
            <a-step title="查看单据" description="确认报销信息、发票和审批记录。" />
            <a-step title="执行审批" description="通过、驳回或转审。" />
          </a-steps>
        </a-card>
      </a-col>

      <a-col :xs="24" :xl="12">
        <a-card :bordered="false" class="guide-card">
          <template #title>财务付款</template>
          <a-steps direction="vertical" size="small" :current="-1">
            <a-step title="进入付款管理" description="从待付款池处理付款任务。" />
            <a-step title="确认付款" description="填写付款信息并确认。" />
            <a-step title="异常处理" description="付款失败或退款在付款管理内完成。" />
          </a-steps>
        </a-card>
      </a-col>

      <a-col :xs="24" :xl="12">
        <a-card :bordered="false" class="guide-card">
          <template #title>治理与日志</template>
          <a-steps direction="vertical" size="small" :current="-1">
            <a-step title="治理配置" description="维护审批流程、报销类型和字典。" />
            <a-step title="数据与日志" description="查看组织、项目、报表和操作日志。" />
          </a-steps>
        </a-card>
      </a-col>
    </a-row>
  </div>
</template>

<style scoped lang="less">
.guide-card {
  border-radius: 22px;
}
</style>
