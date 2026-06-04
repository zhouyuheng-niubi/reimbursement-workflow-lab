<script setup lang="ts">
import { onLaunch } from '@dcloudio/uni-app'
import { primeSession } from '@/composables/useSession'

onLaunch(() => {
  primeSession()
})
</script>

<style lang="scss">
@use '@/styles/base.scss';
</style>
