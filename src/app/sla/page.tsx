'use client'

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useAuth } from '@/context/AuthContext'
import { db } from '@/config/firebase'
import { doc, onSnapshot, setDoc } from 'firebase/firestore'
import { 
  ShieldAlert, 
  Scale, 
  HelpCircle, 
  Search, 
  Printer, 
  ShieldCheck, 
  Clock, 
  Award, 
  Activity, 
  SlidersHorizontal,
  ChevronRight,
  Sparkles,
  FileText,
  Edit,
  Loader2,
  Save,
  CheckCircle2
} from 'lucide-react'

interface SLAData {
  effectiveDate: string
  reviewFrequency: string
  // Section 1
  purposeObjectives: string[]
  purposeApplicability: string
  // Section 2 (Matrix)
  matrix: {
    priority1: { classification: string; response: string; resolution: string }
    priority2: { classification: string; response: string; resolution: string }
    priority3: { classification: string; response: string; resolution: string }
  }
  // Section 3 (Operations)
  sanitationDaily: string
  sanitationWaste: string
  sanitationDeep: string
  securityGuarding: string
  securityVisitor: string
  securitySurveillance: string
  utilityPower: string
  utilityWater: string
  premiumGym: string
  premiumPool: string
  premiumLifts: string
  // Section 4 (Obligations)
  billingCycle: string
  billingDeadline: string
  billingGrace: string
  billingLateFee: string
  billingInterest: string
  conductAcoustic: string
  conductPet: string
  conductParking: string
  // Section 5 (Escalation)
  escalation1: string
  escalation1Desc: string
  escalation2: string
  escalation2Desc: string
  escalation3: string
  escalation3Desc: string
  escalation4: string
  escalation4Desc: string
  // Section 6 (Governance)
  governanceText: string
}

const DEFAULT_SLA_DATA: SLAData = {
  effectiveDate: 'June 1, 2026',
  reviewFrequency: 'Annually',
  purposeObjectives: [
    'Establish objective, measurable benchmarks for facility management operations.',
    'Define clear, time-bound accountability frameworks for onsite management personnel.',
    'Outline the reciprocal operational obligations required from residents to maintain community infrastructure.'
  ],
  purposeApplicability: 'This agreement governs all stakeholders residing in, working at, or managing the estate. This includes property owners, tenants, onsite facility management staff, and third-party contracted service agencies.',
  matrix: {
    priority1: {
      classification: 'Active passenger lift entrapments, absolute grid-power blackouts, major plumbing bursts threatening structural or property damage, active security breaches, or physical safety hazards.',
      response: 'Immediate (< 15 Minutes)',
      resolution: 'Within 2 to 4 Hours'
    },
    priority2: {
      classification: 'Partial localized electrical outages, steady water line leaks, malfunction of peripheral access control/gate barriers, gym/pool equipment failures, or primary common area lighting failures.',
      response: 'Within 2 Hours',
      resolution: 'Within 24 Hours'
    },
    priority3: {
      classification: 'Non-structural indoor plumbing repairs, minor individual billing or payment ledger queries, club facility booking scheduling issues, or cosmetic paint touch-ups.',
      response: 'Within 12 Hours',
      resolution: 'Within 3 Working Days'
    }
  },
  sanitationDaily: 'All main tower lobbies, residential corridors, elevator cabins, and common staircases must be swept, washed, and disinfected daily. All operations must be completed before 10:00 AM.',
  sanitationWaste: 'Door-to-door domestic waste collection crews will service each residential unit once daily between 8:00 AM and 11:00 AM. Residents must pre-segregate waste into separate dry and wet containers.',
  sanitationDeep: 'Rainwater drainage channels, terrace outlets, perimeter trenches, and sewage treatment structures must undergo scheduled preventative cleaning and clearing operations quarterly.',
  securityGuarding: 'The society perimeter, vehicular gates, and strategic pedestrian paths must remain actively manned by licensed security personnel 24 hours a day, 7 days a week, 365 days a year.',
  securityVisitor: 'All external visitors, commercial delivery personnel, contractor staff, and non-resident vehicles must clear explicit authentication checkpoints. This requires validation via the digital society management application or direct telephonic authorization from the host resident prior to entry.',
  securitySurveillance: 'All closed-circuit television (CCTV) cameras covering peripheral walls, elevators, gates, and lobbies must maintain a 98% operational uptime target. Digital footage archives must be preserved securely for a rolling window of at least 30 calendar days.',
  utilityPower: 'In the event of a main municipal power grid failure, the automated Diesel Generator (DG) power backup system must engage and distribute emergency power to common lifts, stairwell lighting, water pumps, and essential residential lines within 30 seconds of the outage.',
  utilityWater: 'Main pressurized domestic water lines will operate reliably during designated peak utility windows daily: Morning block from 6:00 AM to 10:00 AM, and Evening block from 6:00 PM to 10:00 PM.',
  premiumGym: 'The society gymnasium shall be open daily from 5:00 AM – 10:00 AM and 5:00 PM – 9:00 PM. Access is strictly limited to registered residents with active society keycards or digital IDs. Cleaned twice daily. Mechanical safety checks every Sunday. Broken machinery cordoned off and repaired within 48 hours.',
  premiumPool: 'The community swimming pool water chemistry (pH levels and free chlorine concentration) must be tested and adjusted twice daily. The pool facility must be instantly locked and closed to residents if water transparency or biological testing fails local public health standards.',
  premiumLifts: 'Passenger lifts must achieve a cumulative operational availability metric of 99% computed monthly. In the event of a mechanical or electrical failure trapping a passenger, emergency extraction teams must be deployed to the site within 15 minutes.',
  billingCycle: 'Regular monthly community maintenance invoices are issued on the 1st day of each calendar month.',
  billingDeadline: 'Payments are strictly due by the 10th day of that same month.',
  billingGrace: 'A standard late-fee grace period is permitted through the 15th day of the month.',
  billingLateFee: 'Any maintenance account balance remaining unpaid past the 15th day will automatically incur a flat administrative late fee of $15.00 per month.',
  billingInterest: 'Interest will accrue on the overdue balance at a rate of 12% per annum, calculated daily from the original 10th-day deadline until the account is fully cleared.',
  conductAcoustic: 'High-volume social gatherings, structural drilling, or loud audio equipment usage inside apartments is prohibited between 10:00 PM and 7:00 AM daily.',
  conductPet: 'Owners must keep pets on a secure leash at all times while navigating shared society spaces. Pet owners are legally and financially responsible for cleaning up any animal waste dropped on common society grounds immediately.',
  conductParking: 'Residents must park their vehicles exclusively within their designated, numbered bays. Parking in thoroughfares, fire lanes, or unassigned visitor spots will result in immediate wheel-clamping or towing at the vehicle owner\'s expense.',
  escalation1: 'Helpdesk Supervisor',
  escalation1Desc: 'Shift Helpdesk Supervisor / Onsite Technical Lead.',
  escalation2: 'Facility Manager',
  escalation2Desc: 'General Facility Manager (if the problem remains unaddressed past the initial SLA resolution target).',
  escalation3: 'Management Committee Secretary',
  escalation3Desc: 'Management Committee Secretary (if the problem remains unresolved 48 hours after reaching Level 2).',
  escalation4: 'President',
  escalation4Desc: 'President of the Sunrise Apartment Welfare Society (for final administrative review and binding executive decision).',
  governanceText: 'This document operates as a living administrative framework. Any additions, policy adjustments, or structural changes to this SLA require a formal review. Amendments must be introduced, debated, and passed by a simple majority vote of members present during a scheduled Annual General Meeting (AGM) or an Extraordinary General Meeting (EGM) of the society.'
}

export default function SLAPage() {
  const { profile } = useAuth()
  const [slaData, setSlaData] = useState<SLAData>(DEFAULT_SLA_DATA)
  const [loadingSLA, setLoadingSLA] = useState(true)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [editTab, setEditTab] = useState<'general' | 'matrix' | 'standards' | 'financials' | 'escalation'>('general')
  
  // Search and view tab
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState<'all' | 'matrix' | 'standards' | 'financials' | 'escalation'>('all')

  // Edit Local State
  const [editState, setEditState] = useState<SLAData>(DEFAULT_SLA_DATA)

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'sla', 'current'), (snapshot: any) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as SLAData
        setSlaData(data)
        setEditState(data)
      } else {
        setSlaData(DEFAULT_SLA_DATA)
        setEditState(DEFAULT_SLA_DATA)
      }
      setLoadingSLA(false)
    }, (error: any) => {
      console.error('Error fetching SLA:', error)
      setLoadingSLA(false)
    })
    return () => unsub()
  }, [])

  const handleOpenEdit = () => {
    setEditState({ ...slaData })
    setIsEditModalOpen(true)
  }

  const handleSaveSLA = async () => {
    setIsSaving(true)
    try {
      await setDoc(doc(db, 'sla', 'current'), editState)
      setIsEditModalOpen(false)
    } catch (err: any) {
      console.error('Failed to save SLA:', err)
      alert('Failed to save changes: ' + err.message)
    } finally {
      setIsSaving(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  // Severity Matrix mapping from dynamic SLA state
  const matrixRows = [
    {
      tier: 'Priority 1: Emergency',
      classification: 'Life safety, entrapments, structural threats',
      examples: editState.matrix.priority1.classification,
      response: editState.matrix.priority1.response,
      resolution: editState.matrix.priority1.resolution,
      badgeColor: 'bg-red-50 text-red-700 border-red-200',
      badgeVariant: 'destructive' as const
    },
    {
      tier: 'Priority 2: Urgent',
      classification: 'Major system failures, leaks, light outages',
      examples: editState.matrix.priority2.classification,
      response: editState.matrix.priority2.response,
      resolution: editState.matrix.priority2.resolution,
      badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
      badgeVariant: 'warning' as const
    },
    {
      tier: 'Priority 3: Routine',
      classification: 'Minor repairs, billing queries, touch-ups',
      examples: editState.matrix.priority3.classification,
      response: editState.matrix.priority3.response,
      resolution: editState.matrix.priority3.resolution,
      badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      badgeVariant: 'success' as const
    }
  ]

  const filteredMatrix = matrixRows.filter(row => 
    row.tier.toLowerCase().includes(searchTerm.toLowerCase()) ||
    row.examples.toLowerCase().includes(searchTerm.toLowerCase()) ||
    row.response.toLowerCase().includes(searchTerm.toLowerCase()) ||
    row.resolution.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loadingSLA) {
    return (
      <DashboardLayout title="Service Level Agreement (SLA)">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="Service Level Agreement (SLA)">
      <div className="space-y-8 max-w-7xl mx-auto pb-12 print:p-0">
        
        {/* Header Hero Section */}
        <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white rounded-3xl p-6 md:p-10 shadow-2xl border border-white/10 print:bg-white print:text-black print:shadow-none print:border-none">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-72 h-72 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
          
          <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="border-indigo-400/30 bg-indigo-500/10 text-indigo-300 font-semibold px-3 py-1 rounded-full uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                  <Sparkles className="h-3 w-3 animate-pulse" />
                </Badge>
                <Badge variant="outline" className="border-white/10 bg-white/5 text-white/80 font-medium text-[10px] rounded-full">
                  Effective: {slaData.effectiveDate}
                </Badge>
              </div>
              <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-indigo-100 to-indigo-200">
                Service Level Agreement (SLA)
              </h2>
              <p className="text-slate-300 text-sm max-w-2xl leading-relaxed">
                Baseline operational framework for municipal, technical, security, and administrative services provided by the <span className="font-semibold text-white">Sunrise Apartment Welfare Society (SAWS)</span>.
              </p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3 justify-start md:justify-end shrink-0 print:hidden">
              {profile?.role === 'SUPER_ADMIN' && (
                <Button onClick={handleOpenEdit} className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium flex items-center gap-2 shadow-lg shadow-indigo-950/20">
                  <Edit className="h-4 w-4" />
                  Edit SLA Policy
                </Button>
              )}
              <Button onClick={handlePrint} variant="outline" className="bg-white/10 hover:bg-white/20 text-white border-white/20 font-medium flex items-center gap-2">
                <Printer className="h-4 w-4" />
                Print Document
              </Button>
            </div>
          </div>
        </div>

        {/* Search and Navigation Panel */}
        <div className="flex flex-col md:flex-row items-center gap-4 justify-between bg-white p-4 rounded-2xl shadow-sm border border-slate-100 print:hidden">
          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            {(['all', 'matrix', 'standards', 'financials', 'escalation'] as const).map((tab) => (
              <Button
                key={tab}
                variant={activeTab === tab ? 'default' : 'ghost'}
                onClick={() => setActiveTab(tab)}
                className={`rounded-xl px-4 py-2 capitalize font-semibold transition-all ${
                  activeTab === tab 
                    ? 'shadow-md shadow-indigo-100 bg-indigo-600 hover:bg-indigo-700' 
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                {tab === 'all' ? 'Complete SLA' : tab === 'matrix' ? 'Response Matrix' : tab === 'standards' ? 'Operations Standards' : tab === 'financials' ? 'Financials & Conduct' : 'Escalation Tree'}
              </Button>
            ))}
          </div>

          <div className="relative w-full md:w-80 shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Search policies or terms..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 rounded-xl border-slate-200 focus-visible:ring-indigo-500"
            />
          </div>
        </div>

        {/* MAIN SLA POLICY DISPLAY */}
        <div className="space-y-8">
          
          {/* SECTION 1: PURPOSE & SCOPE */}
          {(activeTab === 'all' || activeTab === 'standards') && (
            <Card className="rounded-3xl border-slate-100 shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md">
              <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                    <Scale className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-bold text-slate-900">1. Purpose & Scope</CardTitle>
                    <CardDescription className="text-xs">Baseline parameters, accountability, and applicability</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-6 text-sm text-slate-600 leading-relaxed">
                <div>
                  <h4 className="font-semibold text-slate-800 mb-1">1.1 Objectives</h4>
                  <ul className="list-disc pl-5 space-y-1.5">
                    {slaData.purposeObjectives.map((obj, idx) => (
                      <li key={idx}>{obj}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-slate-800 mb-1">1.2 Applicability</h4>
                  <p>{slaData.purposeApplicability}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* SECTION 2: COMPLAINT CATEGORIZATION & RESPONSE MATRIX */}
          {(activeTab === 'all' || activeTab === 'matrix') && (
            <Card className="rounded-3xl border-slate-100 shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md">
              <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-6">
                <div className="flex items-center gap-3 justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                      <Clock className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-xl font-bold text-slate-900">2. Complaint Categorization & Response Matrix</CardTitle>
                      <CardDescription className="text-xs">Strict incident classification and escalation windows</CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <p className="text-sm text-slate-600 mb-6 leading-relaxed">
                  The Sunrise Apartment Welfare Society Helpdesk commits to receiving, logging, and acting upon maintenance requests within strict performance parameters based on severity.
                </p>
                
                <div className="overflow-x-auto rounded-2xl border border-slate-100 shadow-inner">
                  <table className="w-full text-left text-sm border-collapse min-w-[700px]">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100 text-slate-700 font-semibold">
                        <th className="p-4 w-48">Severity Tier</th>
                        <th className="p-4 w-72">Incident Examples</th>
                        <th className="p-4 w-52">Triage & Response Target</th>
                        <th className="p-4 w-52">Resolution / Stabilization</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredMatrix.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="p-8 text-center text-slate-400">
                            No SLA severity parameters found matching search query.
                          </td>
                        </tr>
                      ) : (
                        filteredMatrix.map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                            <td className="p-4 font-semibold vertical-top">
                              <Badge className={`border uppercase tracking-wider font-semibold text-[10px] rounded-full px-2.5 py-1 ${row.badgeColor}`} variant={row.badgeVariant}>
                                {row.tier}
                              </Badge>
                            </td>
                            <td className="p-4 vertical-top">
                              <p className="font-semibold text-slate-800 text-xs mb-1">{row.classification}</p>
                              <p className="text-xs text-slate-500 leading-relaxed">{row.examples}</p>
                            </td>
                            <td className="p-4 vertical-top font-medium text-slate-800">
                              <div className="flex items-center gap-1.5">
                                <Clock className="h-4.5 w-4.5 text-indigo-500" />
                                <span>{row.response}</span>
                              </div>
                            </td>
                            <td className="p-4 vertical-top font-semibold text-slate-900">
                              <div className="flex items-center gap-1.5">
                                <ShieldCheck className="h-4.5 w-4.5 text-emerald-500" />
                                <span>{row.resolution}</span>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* SECTION 3: FACILITY OPERATIONS & MAINTENANCE STANDARDS */}
          {(activeTab === 'all' || activeTab === 'standards') && (
            <Card className="rounded-3xl border-slate-100 shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md">
              <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                    <Activity className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-bold text-slate-900">3. Facility Operations & Maintenance Standards</CardTitle>
                    <CardDescription className="text-xs">Baseline execution timelines for municipal, administrative, and premium amenities</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-8 text-sm">
                
                {/* 3.1 Sanitation, Hygiene & Waste Systems */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 border-b pb-2 border-slate-100">
                    <span className="font-bold text-indigo-600">3.1</span>
                    <h4 className="font-bold text-slate-800">Sanitation, Hygiene, & Waste Systems</h4>
                  </div>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Daily Upkeep</span>
                      <p className="font-bold text-slate-800 mt-1 mb-1">Common Area Cleaning</p>
                      <p className="text-xs text-slate-600 leading-relaxed">{slaData.sanitationDaily}</p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Waste Collection</span>
                      <p className="font-bold text-slate-800 mt-1 mb-1">Domestic Refuse</p>
                      <p className="text-xs text-slate-600 leading-relaxed">{slaData.sanitationWaste}</p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Preventative Schedule</span>
                      <p className="font-bold text-slate-800 mt-1 mb-1">Deep Infrastructure</p>
                      <p className="text-xs text-slate-600 leading-relaxed">{slaData.sanitationDeep}</p>
                    </div>
                  </div>
                </div>

                {/* 3.2 Security, Surveillance & Access Control */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 border-b pb-2 border-slate-100">
                    <span className="font-bold text-indigo-600">3.2</span>
                    <h4 className="font-bold text-slate-800">Security, Surveillance, & Access Control</h4>
                  </div>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Physical Guarding</span>
                      <p className="font-bold text-slate-800 mt-1 mb-1">Perimeter & Gates</p>
                      <p className="text-xs text-slate-600 leading-relaxed">{slaData.securityGuarding}</p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Visitor Verification</span>
                      <p className="font-bold text-slate-800 mt-1 mb-1">Integrity Protocols</p>
                      <p className="text-xs text-slate-600 leading-relaxed">{slaData.securityVisitor}</p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Electronic System</span>
                      <p className="font-bold text-slate-800 mt-1 mb-1">CCTV Archives</p>
                      <p className="text-xs text-slate-600 leading-relaxed">{slaData.securitySurveillance}</p>
                    </div>
                  </div>
                </div>

                {/* 3.3 Utility Management: Power & Water Backups */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 border-b pb-2 border-slate-100">
                    <span className="font-bold text-indigo-600">3.3</span>
                    <h4 className="font-bold text-slate-800">Utility Management: Power & Water Backups</h4>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="bg-indigo-50 border-indigo-200 text-indigo-600 font-semibold px-2 py-0.5 text-[10px]">DG Backup</Badge>
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Emergency Power</span>
                      </div>
                      <p className="font-bold text-slate-800 mb-1">DG Backups Trigger Window</p>
                      <p className="text-xs text-slate-600 leading-relaxed">{slaData.utilityPower}</p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="bg-indigo-50 border-indigo-200 text-indigo-600 font-semibold px-2 py-0.5 text-[10px]">Peak Supply</Badge>
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Water Utility</span>
                      </div>
                      <p className="font-bold text-slate-800 mb-1">Pressurized Domestic Water Hours</p>
                      <p className="text-xs text-slate-600 leading-relaxed">{slaData.utilityWater}</p>
                    </div>
                  </div>
                </div>

                {/* 3.4 Premium Amenities & Asset Management */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 border-b pb-2 border-slate-100">
                    <span className="font-bold text-indigo-600">3.4</span>
                    <h4 className="font-bold text-slate-800">Premium Amenities & Asset Management</h4>
                  </div>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="bg-indigo-50/20 p-4 rounded-2xl border border-indigo-100/50">
                      <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">🏋️ Gymnasium Assets</span>
                      <p className="font-bold text-slate-800 mt-1 mb-1">Operations & Hygiene</p>
                      <p className="text-xs text-slate-600 leading-relaxed">{slaData.premiumGym}</p>
                    </div>
                    <div className="bg-indigo-50/20 p-4 rounded-2xl border border-indigo-100/50">
                      <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">🏊 Pool Chemistry</span>
                      <p className="font-bold text-slate-800 mt-1 mb-1">Aquatic Facility Uptime</p>
                      <p className="text-xs text-slate-600 leading-relaxed">{slaData.premiumPool}</p>
                    </div>
                    <div className="bg-indigo-50/20 p-4 rounded-2xl border border-indigo-100/50">
                      <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">🛗 Lifts Availability</span>
                      <p className="font-bold text-slate-800 mt-1 mb-1">Elevator Emergency Rescue</p>
                      <p className="text-xs text-slate-600 leading-relaxed">{slaData.premiumLifts}</p>
                    </div>
                  </div>
                </div>

              </CardContent>
            </Card>
          )}

          {/* SECTION 4: RESIDENT OBLIGATIONS & FINANCIAL PERFORMANCE */}
          {(activeTab === 'all' || activeTab === 'financials') && (
            <Card className="rounded-3xl border-slate-100 shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md">
              <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                    <ShieldAlert className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-bold text-slate-900">4. Resident Obligations & Financial Performance</CardTitle>
                    <CardDescription className="text-xs">Deadlines, penalties, code of conduct, and rules compliance</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-6 text-sm text-slate-600 leading-relaxed">
                <div className="grid md:grid-cols-2 gap-6">
                  
                  {/* Financial Standards */}
                  <div className="space-y-3 bg-slate-50/50 p-5 rounded-2xl border border-slate-100">
                    <div className="flex items-center gap-2 mb-2 pb-1 border-b">
                      <Badge className="bg-emerald-600 hover:bg-emerald-700">Financials</Badge>
                      <h4 className="font-bold text-slate-800">Deadlines & Late Penalties</h4>
                    </div>
                    <ul className="space-y-2">
                      <li className="flex items-start gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                        <span><span className="font-semibold text-slate-800">Billing Cycle</span>: {slaData.billingCycle}</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                        <span><span className="font-semibold text-slate-800">Payment Deadline</span>: {slaData.billingDeadline}</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                        <span><span className="font-semibold text-slate-800">Grace Period</span>: {slaData.billingGrace}</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                        <span><span className="font-semibold text-slate-800">Late Administrative Fee</span>: {slaData.billingLateFee}</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                        <span><span className="font-semibold text-slate-800">Interest Accruals</span>: {slaData.billingInterest}</span>
                      </li>
                    </ul>
                  </div>

                  {/* Rules Compliance */}
                  <div className="space-y-3 bg-slate-50/50 p-5 rounded-2xl border border-slate-100">
                    <div className="flex items-center gap-2 mb-2 pb-1 border-b">
                      <Badge className="bg-indigo-600">Compliance</Badge>
                      <h4 className="font-bold text-slate-800">Code of Conduct Rules</h4>
                    </div>
                    <ul className="space-y-2">
                      <li className="flex items-start gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                        <span><span className="font-semibold text-slate-800">Acoustic Quiet Hours</span>: {slaData.conductAcoustic}</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                        <span><span className="font-semibold text-slate-800">Domestic Pet Control</span>: {slaData.conductPet}</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                        <span><span className="font-semibold text-slate-800">Parking Allocations</span>: {slaData.conductParking}</span>
                      </li>
                    </ul>
                  </div>

                </div>
              </CardContent>
            </Card>
          )}

          {/* SECTION 5: ESCALATION MATRIX */}
          {(activeTab === 'all' || activeTab === 'escalation') && (
            <Card className="rounded-3xl border-slate-100 shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md">
              <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                    <SlidersHorizontal className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-bold text-slate-900">5. Escalation Matrix</CardTitle>
                    <CardDescription className="text-xs">Recourse timeline path when service limits or resolution target windows are breached</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <p className="text-sm text-slate-600 mb-8 leading-relaxed">
                  When a logged ticket or service issue is not handled within the timelines specified in Section 2, residents have the right to systematically escalate the matter through the management chain of command.
                </p>

                {/* VISUAL TREE FLOW CHART */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative">
                  
                  {/* LEVEL 1 */}
                  <div className="relative bg-slate-50 p-5 rounded-2xl border border-slate-100 text-center flex flex-col justify-between hover:shadow-sm transition-all">
                    <div>
                      <div className="h-8 w-8 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center mx-auto mb-2 text-sm">1</div>
                      <p className="font-bold text-slate-800 text-sm">{slaData.escalation1}</p>
                      <p className="text-[10px] font-semibold text-slate-400 mt-0.5">Level 1 Escalation</p>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-3 leading-relaxed">{slaData.escalation1Desc}</p>
                  </div>

                  {/* LEVEL 2 */}
                  <div className="relative bg-slate-50 p-5 rounded-2xl border border-slate-100 text-center flex flex-col justify-between hover:shadow-sm transition-all">
                    <div className="absolute top-1/2 -left-3 -translate-y-1/2 hidden md:block text-slate-300">
                      <ChevronRight className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="h-8 w-8 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center mx-auto mb-2 text-sm">2</div>
                      <p className="font-bold text-slate-800 text-sm">{slaData.escalation2}</p>
                      <p className="text-[10px] font-semibold text-slate-400 mt-0.5">Level 2 Escalation</p>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-3 leading-relaxed">{slaData.escalation2Desc}</p>
                  </div>

                  {/* LEVEL 3 */}
                  <div className="relative bg-slate-50 p-5 rounded-2xl border border-slate-100 text-center flex flex-col justify-between hover:shadow-sm transition-all">
                    <div className="absolute top-1/2 -left-3 -translate-y-1/2 hidden md:block text-slate-300">
                      <ChevronRight className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="h-8 w-8 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center mx-auto mb-2 text-sm">3</div>
                      <p className="font-bold text-slate-800 text-sm">{slaData.escalation3}</p>
                      <p className="text-[10px] font-semibold text-slate-400 mt-0.5">Level 3 Escalation</p>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-3 leading-relaxed">{slaData.escalation3Desc}</p>
                  </div>

                  {/* LEVEL 4 */}
                  <div className="relative bg-indigo-900 p-5 rounded-2xl text-center flex flex-col justify-between text-white shadow-md">
                    <div className="absolute top-1/2 -left-3 -translate-y-1/2 hidden md:block text-indigo-700">
                      <ChevronRight className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="h-8 w-8 rounded-full bg-indigo-500 text-white font-bold flex items-center justify-center mx-auto mb-2 text-sm">4</div>
                      <p className="font-bold text-indigo-100 text-sm">{slaData.escalation4}</p>
                      <p className="text-[10px] font-semibold text-indigo-300 mt-0.5">Final Execution Level</p>
                    </div>
                    <p className="text-[11px] text-indigo-200 mt-3 leading-relaxed">{slaData.escalation4Desc}</p>
                  </div>

                </div>
              </CardContent>
            </Card>
          )}

          {/* SECTION 6: AMENDMENTS, GOVERNANCE & SIGN-OFF */}
          {activeTab === 'all' && (
            <Card className="rounded-3xl border-slate-100 shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md">
              <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                    <Award className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-bold text-slate-900">6. Amendments, Governance, & Sign-off</CardTitle>
                    <CardDescription className="text-xs">Living administrative framework execution parameters</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 text-sm text-slate-600 leading-relaxed space-y-6">
                <p>{slaData.governanceText}</p>
                
                {/* Signature Panel */}
                <div className="grid grid-cols-2 gap-8 pt-8 border-t border-slate-100 max-w-xl">
                  <div className="space-y-4">
                    <p className="font-bold text-slate-800">For and on behalf of SAWS:</p>
                    <div className="border-b border-dashed border-slate-300 h-10 w-full" />
                    <div className="text-xs text-slate-500">
                      <p className="font-semibold text-slate-700">President</p>
                      <p>Sunrise Apartment Welfare Society</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <p className="font-bold text-slate-800">Attested By:</p>
                    <div className="border-b border-dashed border-slate-300 h-10 w-full" />
                    <div className="text-xs text-slate-500">
                      <p className="font-semibold text-slate-700">Secretary</p>
                      <p>Sunrise Apartment Welfare Society</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

        </div>

      </div>

      {/* EDIT SLA DIALOG MODAL (Super Admin Only) */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl p-6 shadow-2xl border">
          <DialogHeader className="border-b pb-4 mb-4">
            <DialogTitle className="text-2xl font-bold text-slate-950 flex items-center gap-2">
              <SlidersHorizontal className="h-6 w-6 text-indigo-600" />
              SLA Policy Dynamic Customizer
            </DialogTitle>
            <DialogDescription>
              Modify Sunrise Apartment operational, technical, security, and financial policy values live for all dashboards.
            </DialogDescription>
          </DialogHeader>

          {/* Tab Selector Inside Edit Dialog */}
          <div className="flex border-b border-slate-100 mb-6 gap-2 overflow-x-auto shrink-0 pb-2">
            {(['general', 'matrix', 'standards', 'financials', 'escalation'] as const).map((tab) => (
              <Button
                key={tab}
                variant={editTab === tab ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setEditTab(tab)}
                className={`rounded-lg capitalize ${
                  editTab === tab ? 'bg-indigo-600 hover:bg-indigo-700 text-white font-semibold' : 'text-slate-600 font-medium'
                }`}
              >
                {tab}
              </Button>
            ))}
          </div>

          <div className="space-y-6 flex-1">
            {/* GENERAL TAB */}
            {editTab === 'general' && (
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 uppercase">Effective Date</label>
                  <Input value={editState.effectiveDate} onChange={(e) => setEditState({ ...editState, effectiveDate: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 uppercase">Review Frequency</label>
                  <Input value={editState.reviewFrequency} onChange={(e) => setEditState({ ...editState, reviewFrequency: e.target.value })} />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-xs font-semibold text-slate-500 uppercase">1.2 Applicability Scope Statement</label>
                  <textarea
                    rows={3}
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 border-slate-200"
                    value={editState.purposeApplicability}
                    onChange={(e) => setEditState({ ...editState, purposeApplicability: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-xs font-semibold text-slate-500 uppercase">6. Governance & AGM Amendments Text</label>
                  <textarea
                    rows={4}
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 border-slate-200"
                    value={editState.governanceText}
                    onChange={(e) => setEditState({ ...editState, governanceText: e.target.value })}
                  />
                </div>
              </div>
            )}

            {/* SEVERITY MATRIX TAB */}
            {editTab === 'matrix' && (
              <div className="space-y-6">
                {/* Priority 1 */}
                <div className="p-4 bg-red-50/50 rounded-2xl border border-red-100 space-y-3">
                  <Badge variant="destructive" className="uppercase text-[9px]">Priority 1: Emergency</Badge>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-red-700">Initial Response Target</label>
                      <Input value={editState.matrix.priority1.response} onChange={(e) => setEditState({ ...editState, matrix: { ...editState.matrix, priority1: { ...editState.matrix.priority1, response: e.target.value } } })} />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-red-700">Resolution Target</label>
                      <Input value={editState.matrix.priority1.resolution} onChange={(e) => setEditState({ ...editState, matrix: { ...editState.matrix, priority1: { ...editState.matrix.priority1, resolution: e.target.value } } })} />
                    </div>
                    <div className="space-y-1.5 md:col-span-2">
                      <label className="text-xs font-semibold text-red-700">Incident Classifications & Examples</label>
                      <textarea
                        rows={2}
                        className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 border-red-200"
                        value={editState.matrix.priority1.classification}
                        onChange={(e) => setEditState({ ...editState, matrix: { ...editState.matrix, priority1: { ...editState.matrix.priority1, classification: e.target.value } } })}
                      />
                    </div>
                  </div>
                </div>

                {/* Priority 2 */}
                <div className="p-4 bg-amber-50/50 rounded-2xl border border-amber-100 space-y-3">
                  <Badge variant="warning" className="uppercase text-[9px]">Priority 2: Urgent</Badge>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-amber-700">Initial Response Target</label>
                      <Input value={editState.matrix.priority2.response} onChange={(e) => setEditState({ ...editState, matrix: { ...editState.matrix, priority2: { ...editState.matrix.priority2, response: e.target.value } } })} />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-amber-700">Resolution Target</label>
                      <Input value={editState.matrix.priority2.resolution} onChange={(e) => setEditState({ ...editState, matrix: { ...editState.matrix, priority2: { ...editState.matrix.priority2, resolution: e.target.value } } })} />
                    </div>
                    <div className="space-y-1.5 md:col-span-2">
                      <label className="text-xs font-semibold text-amber-700">Incident Classifications & Examples</label>
                      <textarea
                        rows={2}
                        className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 border-amber-200"
                        value={editState.matrix.priority2.classification}
                        onChange={(e) => setEditState({ ...editState, matrix: { ...editState.matrix, priority2: { ...editState.matrix.priority2, classification: e.target.value } } })}
                      />
                    </div>
                  </div>
                </div>

                {/* Priority 3 */}
                <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100 space-y-3">
                  <Badge variant="success" className="uppercase text-[9px]">Priority 3: Routine</Badge>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-emerald-700">Initial Response Target</label>
                      <Input value={editState.matrix.priority3.response} onChange={(e) => setEditState({ ...editState, matrix: { ...editState.matrix, priority3: { ...editState.matrix.priority3, response: e.target.value } } })} />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-emerald-700">Resolution Target</label>
                      <Input value={editState.matrix.priority3.resolution} onChange={(e) => setEditState({ ...editState, matrix: { ...editState.matrix, priority3: { ...editState.matrix.priority3, resolution: e.target.value } } })} />
                    </div>
                    <div className="space-y-1.5 md:col-span-2">
                      <label className="text-xs font-semibold text-emerald-700">Incident Classifications & Examples</label>
                      <textarea
                        rows={2}
                        className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 border-emerald-200"
                        value={editState.matrix.priority3.classification}
                        onChange={(e) => setEditState({ ...editState, matrix: { ...editState.matrix, priority3: { ...editState.matrix.priority3, classification: e.target.value } } })}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STANDARDS TAB */}
            {editTab === 'standards' && (
              <div className="space-y-5">
                <div className="border-b pb-2">
                  <h4 className="font-bold text-slate-800 text-sm">3.1 Sanitation & Waste Standards</h4>
                </div>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-500">Daily Common Cleanings</label>
                    <textarea rows={3} className="flex w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" value={editState.sanitationDaily} onChange={(e) => setEditState({ ...editState, sanitationDaily: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-500">Refuse Collections</label>
                    <textarea rows={3} className="flex w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" value={editState.sanitationWaste} onChange={(e) => setEditState({ ...editState, sanitationWaste: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-500">Deep Preventative Cleaning</label>
                    <textarea rows={3} className="flex w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" value={editState.sanitationDeep} onChange={(e) => setEditState({ ...editState, sanitationDeep: e.target.value })} />
                  </div>
                </div>

                <div className="border-b pb-2 pt-2">
                  <h4 className="font-bold text-slate-800 text-sm">3.2 Security, Access & Surveillance</h4>
                </div>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-500">Physical Guarding deployments</label>
                    <textarea rows={3} className="flex w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" value={editState.securityGuarding} onChange={(e) => setEditState({ ...editState, securityGuarding: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-500">Visitor Verification Protocols</label>
                    <textarea rows={3} className="flex w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" value={editState.securityVisitor} onChange={(e) => setEditState({ ...editState, securityVisitor: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-500">Surveillance camera archives</label>
                    <textarea rows={3} className="flex w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" value={editState.securitySurveillance} onChange={(e) => setEditState({ ...editState, securitySurveillance: e.target.value })} />
                  </div>
                </div>

                <div className="border-b pb-2 pt-2">
                  <h4 className="font-bold text-slate-800 text-sm">3.3 - 3.4 Utility Backups & Premium Amenities</h4>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-500">3.3 Emergency Power Outage Trigger</label>
                    <textarea rows={3} className="flex w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" value={editState.utilityPower} onChange={(e) => setEditState({ ...editState, utilityPower: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-500">3.3 Pressurized Water Utility Supply Hours</label>
                    <textarea rows={3} className="flex w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" value={editState.utilityWater} onChange={(e) => setEditState({ ...editState, utilityWater: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-500">3.4 Gymnasium Assets operations</label>
                    <textarea rows={3} className="flex w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" value={editState.premiumGym} onChange={(e) => setEditState({ ...editState, premiumGym: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-500">3.4 Pool water chemistry checks</label>
                    <textarea rows={3} className="flex w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" value={editState.premiumPool} onChange={(e) => setEditState({ ...editState, premiumPool: e.target.value })} />
                  </div>
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-xs font-semibold text-slate-500">3.4 Lifts availability monthly target & rescues</label>
                    <textarea rows={2} className="flex w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" value={editState.premiumLifts} onChange={(e) => setEditState({ ...editState, premiumLifts: e.target.value })} />
                  </div>
                </div>
              </div>
            )}

            {/* FINANCIALS & CONDUCT TAB */}
            {editTab === 'financials' && (
              <div className="space-y-5">
                <div className="border-b pb-2">
                  <h4 className="font-bold text-slate-800 text-sm">4.1 Maintenance Dues and Financial Deadlines</h4>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-500">Monthly Billing Cycle</label>
                    <Input value={editState.billingCycle} onChange={(e) => setEditState({ ...editState, billingCycle: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-500">Payment Deadline (Dues date)</label>
                    <Input value={editState.billingDeadline} onChange={(e) => setEditState({ ...editState, billingDeadline: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-500">Late Fee Grace Period (Permitted window)</label>
                    <Input value={editState.billingGrace} onChange={(e) => setEditState({ ...editState, billingGrace: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-500">Late Administrative Fee Penalty</label>
                    <Input value={editState.billingLateFee} onChange={(e) => setEditState({ ...editState, billingLateFee: e.target.value })} />
                  </div>
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-xs font-semibold text-slate-500">Interest Accruals and Rates Details</label>
                    <textarea rows={2} className="flex w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" value={editState.billingInterest} onChange={(e) => setEditState({ ...editState, billingInterest: e.target.value })} />
                  </div>
                </div>

                <div className="border-b pb-2 pt-2">
                  <h4 className="font-bold text-slate-800 text-sm">4.2 Code of Conduct & Rules Compliance</h4>
                </div>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-500">Acoustic Quiet Hours</label>
                    <Input value={editState.conductAcoustic} onChange={(e) => setEditState({ ...editState, conductAcoustic: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-500">Domestic Pet Management Rules</label>
                    <textarea rows={2} className="flex w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" value={editState.conductPet} onChange={(e) => setEditState({ ...editState, conductPet: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-500">Parking Asset Allocations & Penalty Clamping</label>
                    <textarea rows={2} className="flex w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" value={editState.conductParking} onChange={(e) => setEditState({ ...editState, conductParking: e.target.value })} />
                  </div>
                </div>
              </div>
            )}

            {/* ESCALATION TAB */}
            {editTab === 'escalation' && (
              <div className="space-y-5">
                <div className="border-b pb-2">
                  <h4 className="font-bold text-slate-800 text-sm">5. Escalation Matrix Levels Management</h4>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  {/* Level 1 */}
                  <div className="space-y-1.5 bg-slate-50 p-4 rounded-xl border">
                    <label className="text-xs font-bold text-indigo-700">Level 1: Title</label>
                    <Input value={editState.escalation1} onChange={(e) => setEditState({ ...editState, escalation1: e.target.value })} />
                    <label className="text-xs font-semibold text-slate-500 mt-2 block">Level 1: Description</label>
                    <textarea rows={2} className="flex w-full rounded-md border border-slate-200 px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none" value={editState.escalation1Desc} onChange={(e) => setEditState({ ...editState, escalation1Desc: e.target.value })} />
                  </div>
                  
                  {/* Level 2 */}
                  <div className="space-y-1.5 bg-slate-50 p-4 rounded-xl border">
                    <label className="text-xs font-bold text-indigo-700">Level 2: Title</label>
                    <Input value={editState.escalation2} onChange={(e) => setEditState({ ...editState, escalation2: e.target.value })} />
                    <label className="text-xs font-semibold text-slate-500 mt-2 block">Level 2: Description</label>
                    <textarea rows={2} className="flex w-full rounded-md border border-slate-200 px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none" value={editState.escalation2Desc} onChange={(e) => setEditState({ ...editState, escalation2Desc: e.target.value })} />
                  </div>

                  {/* Level 3 */}
                  <div className="space-y-1.5 bg-slate-50 p-4 rounded-xl border">
                    <label className="text-xs font-bold text-indigo-700">Level 3: Title</label>
                    <Input value={editState.escalation3} onChange={(e) => setEditState({ ...editState, escalation3: e.target.value })} />
                    <label className="text-xs font-semibold text-slate-500 mt-2 block">Level 3: Description</label>
                    <textarea rows={2} className="flex w-full rounded-md border border-slate-200 px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none" value={editState.escalation3Desc} onChange={(e) => setEditState({ ...editState, escalation3Desc: e.target.value })} />
                  </div>

                  {/* Level 4 */}
                  <div className="space-y-1.5 bg-slate-50 p-4 rounded-xl border">
                    <label className="text-xs font-bold text-indigo-700">Level 4: Title</label>
                    <Input value={editState.escalation4} onChange={(e) => setEditState({ ...editState, escalation4: e.target.value })} />
                    <label className="text-xs font-semibold text-slate-500 mt-2 block">Level 4: Description</label>
                    <textarea rows={2} className="flex w-full rounded-md border border-slate-200 px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none" value={editState.escalation4Desc} onChange={(e) => setEditState({ ...editState, escalation4Desc: e.target.value })} />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 border-t pt-4 mt-6">
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)} disabled={isSaving}>Cancel</Button>
            <Button onClick={handleSaveSLA} disabled={isSaving} className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium flex items-center gap-2">
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save Live Policy
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}
