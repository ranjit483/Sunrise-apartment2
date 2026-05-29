'use client'

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog'
import { useAuth } from '@/context/AuthContext'
import { db } from '@/config/firebase'
import { collection, onSnapshot, query, orderBy, addDoc, updateDoc, doc } from 'firebase/firestore'
import { Complaint } from '@/types/models'
import { 
  AlertTriangle, CheckCircle, Clock, Plus, User, Info, 
  Sparkles, FileText, ListFilter, Calendar, X, ChevronRight, MessageSquare, ShieldAlert, Loader2
} from 'lucide-react'

const categoryIcons: Record<string, any> = {
  Noise: ShieldAlert,
  'Garbage/Cleaning': Info,
  Security: ShieldAlert,
  Parking: Info,
  Amenities: Sparkles,
  Others: AlertTriangle
}

const statusColors: Record<string, string> = { 
  open: 'bg-rose-100 text-rose-800 border-rose-200', 
  in_progress: 'bg-amber-100 text-amber-800 border-amber-200', 
  resolved: 'bg-emerald-100 text-emerald-800 border-emerald-200', 
  closed: 'bg-gray-100 text-gray-800 border-gray-200' 
}

const COMPLAINT_CATEGORIES = ['Noise', 'Garbage/Cleaning', 'Security', 'Parking', 'Amenities', 'Staff Behavior', 'Others']

export default function ComplaintsPage() {
  const { profile } = useAuth()
  const [complaints, setComplaints] = useState<Complaint[]>([])
  const [loading, setLoading] = useState(true)

  // Modals state
  const [isNewComplaintOpen, setIsNewComplaintOpen] = useState(false)
  const [isActionOpen, setIsActionOpen] = useState(false)
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null)

  // Raise Complaint Form State
  const [category, setCategory] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Admin action state
  const [newStatus, setNewStatus] = useState<'open' | 'in_progress' | 'resolved' | 'closed'>('open')
  const [adminRemarks, setAdminRemarks] = useState('')

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'in_progress' | 'resolved'>('all')

  useEffect(() => {
    if (!profile) return;
    
    const q = query(collection(db, 'complaints'), orderBy('createdAt', 'desc'))
    const unsubscribe = onSnapshot(q, (snapshot: any) => {
      const cData: Complaint[] = []
      snapshot.forEach((doc: any) => {
        const data = { id: doc.id, ...doc.data() } as Complaint;
        
        // Role based visibility check
        if (profile.role === 'GUARD') {
          // Guards only see Parking, Security, and Emergency categories
          const allowedCategories = ['Parking', 'Security', 'Emergency']
          if (data.category && allowedCategories.includes(data.category)) {
            cData.push(data)
          }
        } else if (!['SUPER_ADMIN', 'MANAGER', 'ACCOUNTANT'].includes(profile.role)) {
          // Residents/Tenants see ONLY their own reported complaints
          if (data.tenantId === profile.uid || data.tenantId === profile.fullName) {
            cData.push(data)
          }
        } else {
          // Admins see ALL complaints
          cData.push(data)
        }
      })
      setComplaints(cData)
      setLoading(false)
    }, (error: any) => {
      console.error('Error fetching complaints:', error)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [profile])

  // Sync state if active complaint changes
  const activeComplaint = complaints.find(c => c.id === selectedComplaint?.id) || selectedComplaint

  const handleRaiseComplaint = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile) return
    setIsSubmitting(true)

    try {
      const now = new Date().toISOString()
      const newTicket: Omit<Complaint, 'id'> = {
        tenantId: profile.uid,
        tenantName: profile.fullName,
        title,
        description,
        category,
        status: 'open',
        adminRemarks: '',
        createdAt: now,
        updatedAt: now
      }

      await addDoc(collection(db, 'complaints'), newTicket)

      // Reset
      setTitle('')
      setDescription('')
      setCategory('')
      setIsNewComplaintOpen(false)
    } catch (error) {
      console.error('Error raising complaint:', error)
      alert('Failed to submit complaint')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAdminAction = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeComplaint) return

    try {
      const docRef = doc(db, 'complaints', activeComplaint.id)
      await updateDoc(docRef, {
        status: newStatus,
        adminRemarks,
        updatedAt: new Date().toISOString()
      })
      setIsActionOpen(false)
      setAdminRemarks('')
    } catch (error) {
      console.error('Error updating complaint:', error)
      alert('Failed to update complaint status')
    }
  }

  const filteredComplaints = complaints.filter(c => {
    if (statusFilter !== 'all' && c.status !== statusFilter) return false
    
    if (searchQuery) {
      const queryLower = searchQuery.toLowerCase()
      return (
        c.title.toLowerCase().includes(queryLower) ||
        c.description.toLowerCase().includes(queryLower) ||
        (c.category && c.category.toLowerCase().includes(queryLower))
      )
    }
    return true
  })

  // Counters
  const openCount = complaints.filter(c => c.status === 'open').length
  const inProgressCount = complaints.filter(c => c.status === 'in_progress').length
  const resolvedCount = complaints.filter(c => c.status === 'resolved').length

  const getCategoryIcon = (cat?: string) => {
    const Icon = categoryIcons[cat || 'Others'] || AlertTriangle
    return <Icon className="h-4 w-4 mr-1 text-gray-500" />
  }

  const isAdminOrManager = profile ? ['SUPER_ADMIN', 'MANAGER', 'ACCOUNTANT'].includes(profile.role) : false
  const isGuard = profile?.role === 'GUARD'

  return (
    <DashboardLayout title="Complaints Center">
      <div className="space-y-6 max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight text-gray-900 flex items-center gap-2">
              <ShieldAlert className="h-8 w-8 text-rose-500" />
              Complaints & Grievances
            </h2>
            <p className="text-muted-foreground mt-1">
              {isAdminOrManager 
                ? 'Society Dispute Resolutions & Grievance Control Room' 
                : isGuard 
                  ? 'Security & Parking Violations Tracker' 
                  : 'Report society grievances and track resolution updates'}
            </p>
          </div>

          {!isGuard && (
            <Dialog open={isNewComplaintOpen} onOpenChange={setIsNewComplaintOpen}>
              <DialogTrigger asChild>
                <Button className="bg-rose-600 hover:bg-rose-700 text-white font-medium shadow flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  File Complaint
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md rounded-xl shadow-2xl">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-bold flex items-center gap-2 text-rose-600">
                    <AlertTriangle className="h-6 w-6 text-rose-500" />
                    File Official Complaint
                  </DialogTitle>
                  <DialogDescription>
                    Provide precise details of the grievance. Our Management Office reviews all filings confidentially and acts strictly according to society bylaws.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleRaiseComplaint} className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Grievance Category *</Label>
                    <Select required value={category} onValueChange={setCategory}>
                      <SelectTrigger><SelectValue placeholder="Select Category" /></SelectTrigger>
                      <SelectContent>
                        {COMPLAINT_CATEGORIES.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Title *</Label>
                    <Input required value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Constant late night noise, Block B lobby dirty" />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Description of Issue *</Label>
                    <textarea 
                      required 
                      value={description} 
                      onChange={e => setDescription(e.target.value)} 
                      rows={4} 
                      className="w-full text-sm rounded-md border border-input bg-transparent px-3 py-2 shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      placeholder="Please detail dates, times, and exact location of the occurrence to assist in fast triage."
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <Button type="button" variant="outline" onClick={() => setIsNewComplaintOpen(false)}>Cancel</Button>
                    <Button type="submit" disabled={isSubmitting} className="bg-rose-600 hover:bg-rose-700 text-white">
                      File Complaint
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border-l-4 border-l-rose-500 hover:shadow-md transition">
            <CardContent className="p-6 flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-500 uppercase tracking-wider font-semibold">Open Grievances</p>
                <p className="text-3xl font-extrabold text-gray-900 mt-1">{openCount}</p>
              </div>
              <div className="p-3 bg-rose-50 rounded-full text-rose-600"><AlertTriangle className="h-6 w-6" /></div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-amber-500 hover:shadow-md transition">
            <CardContent className="p-6 flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-500 uppercase tracking-wider font-semibold">In Investigation</p>
                <p className="text-3xl font-extrabold text-gray-900 mt-1">{inProgressCount}</p>
              </div>
              <div className="p-3 bg-amber-50 rounded-full text-amber-600"><Clock className="h-6 w-6" /></div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-emerald-500 hover:shadow-md transition">
            <CardContent className="p-6 flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-500 uppercase tracking-wider font-semibold">Resolved Cases</p>
                <p className="text-3xl font-extrabold text-gray-900 mt-1">{resolvedCount}</p>
              </div>
              <div className="p-3 bg-emerald-50 rounded-full text-emerald-600"><CheckCircle className="h-6 w-6" /></div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-gray-400 hover:shadow-md transition">
            <CardContent className="p-6 flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-500 uppercase tracking-wider font-semibold">Total Audited</p>
                <p className="text-3xl font-extrabold text-gray-900 mt-1">{complaints.length}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-full text-gray-600"><FileText className="h-6 w-6" /></div>
            </CardContent>
          </Card>
        </div>

        {/* List & Details split screen layout */}
        <div className="grid gap-6 lg:grid-cols-3">
          
          {/* Left Panel */}
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader className="pb-3 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    <ListFilter className="h-5 w-5 text-gray-500" />
                    Resident Grievances Log
                  </CardTitle>
                </div>
                <div className="flex flex-wrap gap-2 items-center">
                  <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
                    <SelectTrigger className="w-[130px] h-9"><SelectValue placeholder="All Status" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input 
                    placeholder="Search complaints..." 
                    className="w-[180px] h-9" 
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                  />
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {loading ? (
                  <div className="flex justify-center items-center py-12"><Loader2 className="h-8 w-8 animate-spin text-rose-500" /></div>
                ) : filteredComplaints.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                    No matching complaints found.
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
                    {filteredComplaints.map((c) => (
                      <div 
                        key={c.id} 
                        onClick={() => setSelectedComplaint(c)}
                        className={`p-4 hover:bg-rose-50/15 cursor-pointer transition flex items-start justify-between gap-4 ${
                          selectedComplaint?.id === c.id ? 'bg-rose-50/30 border-l-4 border-l-rose-500' : ''
                        }`}
                      >
                        <div className="space-y-1.5 flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono bg-gray-100 px-2 py-0.5 rounded text-gray-600 font-semibold">
                              {c.id.substring(0, 8)}
                            </span>
                            <Badge variant="outline" className="flex items-center text-[10px] py-0">
                              {getCategoryIcon(c.category)}
                              {c.category || 'General'}
                            </Badge>
                          </div>
                          <h4 className="font-bold text-gray-900 truncate">{c.title}</h4>
                          <p className="text-sm text-gray-500 line-clamp-1">{c.description}</p>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400 font-medium mt-1">
                            <span className="flex items-center gap-1"><User className="h-3 w-3" /> Reported: {c.tenantName || 'Resident'}</span>
                            <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {new Date(c.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>

                        <div className="flex flex-col gap-2 items-end self-stretch justify-between flex-shrink-0">
                          <Badge variant="outline" className={`capitalize text-xs font-semibold ${statusColors[c.status]}`}>
                            {c.status.replace('_', ' ')}
                          </Badge>
                          <ChevronRight className="h-5 w-5 text-gray-400" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Panel */}
          <div className="lg:col-span-1">
            {activeComplaint ? (
              <Card className="shadow sticky top-6 border-rose-100">
                <CardHeader className="bg-rose-50/15 border-b pb-4">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <span className="text-xs font-mono font-bold text-gray-500">{activeComplaint.id.substring(0, 8)}</span>
                      <CardTitle className="text-xl font-black text-gray-900 mt-0.5">{activeComplaint.title}</CardTitle>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => setSelectedComplaint(null)}><X className="h-4 w-4" /></Button>
                  </div>
                  <Badge className={`capitalize font-semibold mt-2 ${statusColors[activeComplaint.status]}`}>{activeComplaint.status.replace('_', ' ')}</Badge>
                </CardHeader>

                <CardContent className="p-5 space-y-5 text-sm">
                  {/* Description */}
                  <div className="space-y-1.5 bg-gray-50 p-3 rounded-lg border">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Grievance Description</p>
                    <p className="text-gray-700 leading-relaxed">{activeComplaint.description}</p>
                  </div>

                  {/* Metadata */}
                  <div className="grid grid-cols-2 gap-4 border-b pb-4">
                    <div>
                      <p className="text-xs font-bold text-gray-400 uppercase">Category</p>
                      <p className="font-semibold text-gray-800 mt-0.5">{activeComplaint.category || 'General'}</p>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-400 uppercase">Reported By</p>
                      <p className="font-semibold text-gray-800 mt-0.5">{activeComplaint.tenantName || 'Resident'}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-xs font-bold text-gray-400 uppercase">Filing Date</p>
                      <p className="font-semibold text-gray-800 mt-0.5">{new Date(activeComplaint.createdAt).toLocaleString()}</p>
                    </div>
                  </div>

                  {/* Admin Remarks Section */}
                  <div className="space-y-2 bg-rose-50/10 border border-rose-100/50 p-3 rounded-xl">
                    <p className="text-xs font-bold text-rose-700 uppercase tracking-wider flex items-center gap-1">
                      <MessageSquare className="h-3.5 w-3.5" />
                      Management Remarks
                    </p>
                    {activeComplaint.adminRemarks ? (
                      <p className="text-gray-700 italic">"{activeComplaint.adminRemarks}"</p>
                    ) : (
                      <p className="text-xs text-gray-400 italic">No management remarks logged yet.</p>
                    )}
                  </div>

                  {/* Actions (Admins & Guards only) */}
                  {(isAdminOrManager || isGuard) && activeComplaint.status !== 'closed' && (
                    <Dialog open={isActionOpen} onOpenChange={setIsActionOpen}>
                      <DialogTrigger asChild>
                        <Button 
                          onClick={() => {
                            setNewStatus(activeComplaint.status);
                            setAdminRemarks(activeComplaint.adminRemarks || '');
                          }}
                          className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold flex items-center justify-center gap-2"
                        >
                          <MessageSquare className="h-4 w-4" />
                          Update Investigation Status
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md rounded-xl">
                        <DialogHeader>
                          <DialogTitle className="font-bold text-rose-700">Update Grievance Status</DialogTitle>
                          <DialogDescription>Change investigation status and log resolution remarks for the resident to see.</DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleAdminAction} className="space-y-4 pt-2">
                          <div className="space-y-2">
                            <Label className="text-sm font-semibold">Status *</Label>
                            <Select required value={newStatus} onValueChange={(v: any) => setNewStatus(v)}>
                              <SelectTrigger><SelectValue placeholder="Select Status" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="open">Open / Triage</SelectItem>
                                <SelectItem value="in_progress">In Investigation</SelectItem>
                                <SelectItem value="resolved">Resolved</SelectItem>
                                <SelectItem value="closed">Closed / Archived</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label className="text-sm font-semibold">Management Remarks / Response *</Label>
                            <textarea 
                              required 
                              value={adminRemarks} 
                              onChange={e => setAdminRemarks(e.target.value)} 
                              rows={3}
                              className="w-full text-sm rounded-md border border-input bg-transparent px-3 py-2 shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                              placeholder="Log details of mediation, warning letters sent, or general remarks..."
                            />
                          </div>

                          <div className="flex justify-end gap-3 pt-2">
                            <Button type="button" variant="outline" onClick={() => setIsActionOpen(false)}>Cancel</Button>
                            <Button type="submit" className="bg-rose-600 hover:bg-rose-700 text-white">Save Changes</Button>
                          </div>
                        </form>
                      </DialogContent>
                    </Dialog>
                  )}

                  {/* Completion Tag */}
                  {activeComplaint.status === 'closed' && (
                    <div className="p-3 text-center rounded bg-gray-100 border text-gray-500 font-semibold text-xs flex items-center justify-center gap-2">
                      <CheckCircle className="h-4 w-4 text-gray-400" />
                      Grievance Resolved & Closed
                    </div>
                  )}

                </CardContent>
              </Card>
            ) : (
              <Card className="border-dashed border-2 border-gray-300 shadow-none flex flex-col justify-center items-center py-20 px-6 sticky top-6">
                <ShieldAlert className="h-12 w-12 text-gray-300 mb-3 animate-pulse" />
                <p className="text-sm font-bold text-gray-500 text-center">No Grievance Selected</p>
                <p className="text-xs text-gray-400 text-center mt-1">Select any case file from the logs to inspect descriptions, category details, reporting party, and manage action responses.</p>
              </Card>
            )}
          </div>

        </div>

      </div>
    </DashboardLayout>
  )
}