import Hero from '../sections/followup/Hero'
import Problem from '../sections/followup/Problem'
import Workflow from '../sections/followup/Workflow'
import Capabilities from '../sections/followup/Capabilities'
import ROI from '../sections/followup/ROI'
import UseCases from '../sections/followup/UseCases'
import FAQ from '../sections/followup/FAQ'
import CrossSell from '../sections/followup/CrossSell'
import CTA from '../sections/followup/CTA'

export default function FollowUpAgent() {
  return (
    <>
      <Hero />
      <Problem />
      <Workflow />
      <Capabilities />
      <ROI />
      <UseCases />
      <FAQ />
      <CrossSell />
      <CTA />
    </>
  )
}
