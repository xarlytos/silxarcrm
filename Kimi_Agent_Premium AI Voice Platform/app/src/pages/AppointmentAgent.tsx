import Hero from '../sections/appointment/Hero'
import Problem from '../sections/appointment/Problem'
import Workflow from '../sections/appointment/Workflow'
import Capabilities from '../sections/appointment/Capabilities'
import ROI from '../sections/appointment/ROI'
import Verticals from '../sections/appointment/Verticals'
import FAQ from '../sections/appointment/FAQ'
import CrossSell from '../sections/appointment/CrossSell'
import CTA from '../sections/appointment/CTA'

export default function AppointmentAgent() {
  return (
    <>
      <Hero />
      <Problem />
      <Workflow />
      <Capabilities />
      <ROI />
      <Verticals />
      <FAQ />
      <CrossSell />
      <CTA />
    </>
  )
}
