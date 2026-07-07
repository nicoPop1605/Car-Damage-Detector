import { useState, useRef } from 'react'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import autoTable from 'jspdf-autotable'

interface BoundingBox { x1: number; y1: number; x2: number; y2: number; }
interface Damage { part: string; estimated_cost: number; confidence: number; bounding_box?: BoundingBox; }
interface APIResult { status: string; message: string; total_estimated_cost?: number; detected_damages?: Damage[]; }
interface HistoryRecord { id: number; car_make: string; car_year: number; total_cost: number; damage_summary: string; scan_date: string; }

const ConfidenceBar = ({ confidence }: { confidence: number }) => {
    const percentage = Math.round(confidence * 100);
    let color = "#28a745";
    if (percentage < 75) color = "#ffc107";
    if (percentage < 50) color = "#dc3545";

    return (
        <div style={{ marginTop: '10px', marginBottom: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>
                <span>AI Confidence</span>
                <span style={{ fontWeight: 'bold', color: color }}>{percentage}%</span>
            </div>
            <div style={{ width: "100%", backgroundColor: "#e2e8f0", borderRadius: "4px", height: "6px", overflow: "hidden" }}>
                <div style={{ width: `${percentage}%`, backgroundColor: color, height: "100%", transition: "width 1s ease-in-out" }} />
            </div>
        </div>
    );
};

function App() {
    // UI State
    const [activeTab, setActiveTab] = useState<'estimator' | 'history'>('estimator')

    // Estimator State
    const [file, setFile] = useState<File | null>(null)
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)
    const [carMake, setCarMake] = useState<string>('Ford')
    const [carYear, setCarYear] = useState<number>(2015)
    const [loading, setLoading] = useState<boolean>(false)
    const [result, setResult] = useState<APIResult | null>(null)

    // History State
    const [history, setHistory] = useState<HistoryRecord[]>([])
    const [loadingHistory, setLoadingHistory] = useState<boolean>(false)

    // PDF Ref (Targets only the image with bounding boxes)
    const imageRef = useRef<HTMLDivElement>(null)

    // --- API CALLS ---
    const fetchHistory = async () => {
        setLoadingHistory(true)
        try {
            const response = await fetch('http://127.0.0.1:8000/claim-history/')
            const data = await response.json()
            if (data.status === 'success') {
                setHistory(data.history)
            }
        } catch (error) {
            console.error('Failed to fetch history:', error)
        } finally {
            setLoadingHistory(false)
        }
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const selectedFile = e.target.files[0]
            setFile(selectedFile)
            setResult(null)
            const objectUrl = URL.createObjectURL(selectedFile)
            setPreviewUrl(objectUrl)
        }
    }

    const handleUpload = async () => {
        if (!file) return
        setLoading(true)

        const formData = new FormData()
        formData.append('file', file)
        formData.append('car_make', carMake)
        formData.append('car_year', carYear.toString())

        try {
            const response = await fetch('http://127.0.0.1:8000/estimate-damage/', {
                method: 'POST',
                body: formData,
            })
            const data: APIResult = await response.json()
            setResult(data)
        } catch (error) {
            console.error('Error connecting to the API:', error)
        } finally {
            setLoading(false)
        }
    }

    // --- PDF GENERATOR ---
    const generatePDF = async () => {
        if (!result) return;

        const doc = new jsPDF('p', 'mm', 'a4');

        // 1. HEADER
        doc.setFontSize(22);
        doc.setTextColor(15, 23, 42);
        doc.text("Official Damage Inspection Report", 14, 20);

        doc.setFontSize(11);
        doc.setTextColor(100, 116, 139);
        const dateStr = new Date().toLocaleDateString('en-GB');
        const timeStr = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
        doc.text(`Generated on: ${dateStr} at ${timeStr}`, 14, 28);
        doc.text(`Vehicle: ${carMake} (Year: ${carYear})`, 14, 34);
        doc.text(`AI Assessment: ${result.message}`, 14, 40);

        doc.setDrawColor(203, 213, 225);
        doc.line(14, 45, 196, 45);

        let currentY = 55;

        // 2. CAPTURE & INSERT THE CAR IMAGE
        if (imageRef.current) {
            try {
                const canvas = await html2canvas(imageRef.current, { scale: 2, useCORS: true });
                const imgData = canvas.toDataURL('image/png');
                const imgWidth = 182;
                const imgHeight = (canvas.height * imgWidth) / canvas.width;

                doc.addImage(imgData, 'PNG', 14, currentY, imgWidth, imgHeight);
                currentY += imgHeight + 15;
            } catch (error) {
                console.error("Could not capture image", error);
            }
        }

        // 3. CREATE THE ITEMIZED TABLE
        if (result.detected_damages && result.detected_damages.length > 0) {
            const tableBody = result.detected_damages.map(damage => [
                damage.part.replace(/-/g, ' ').toUpperCase(),
                `${Math.round(damage.confidence * 100)}%`,
                `${damage.estimated_cost} RON`
            ]);

            autoTable(doc, {
                startY: currentY,
                head: [['Damaged Component', 'AI Confidence', 'Estimated Cost']],
                body: tableBody,
                theme: 'striped',
                headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold' },
                styles: { fontSize: 11, cellPadding: 5 },
                columnStyles: {
                    0: { cellWidth: 90 },
                    1: { halign: 'center' },
                    2: { halign: 'right', fontStyle: 'bold' }
                }
            });

            // Cast doc to any to access the last table's position safely in TypeScript
            currentY = (doc as any).lastAutoTable.finalY + 15;
        }

        // 4. FOOTER & TOTAL COST
        doc.setFontSize(16);
        doc.setTextColor(220, 38, 38);
        doc.text(`Total Estimated Repair Cost: ${result.total_estimated_cost} RON`, 14, currentY);

        doc.save(`Damage_Report_${carMake}_${carYear}.pdf`);
    };

    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#e1f0fa', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', fontFamily: 'system-ui, -apple-system, sans-serif', padding: '2rem' }}>
            <div style={{ backgroundColor: '#ffffff', padding: '3rem', borderRadius: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.08)', maxWidth: activeTab === 'history' ? '800px' : '650px', width: '100%', textAlign: 'center', transition: 'max-width 0.3s ease' }}>

                <h1 style={{ color: '#1a1a1a', margin: '0 0 0.5rem 0', fontSize: '36px' }}>AI Auto Damage Estimator</h1>

                {/* TAB NAVIGATION */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginBottom: '2rem', borderBottom: '2px solid #e2e8f0', paddingBottom: '1rem' }}>
                    <button
                        onClick={() => setActiveTab('estimator')}
                        style={{ padding: '0.5rem 1rem', border: 'none', background: 'none', fontSize: '16px', fontWeight: 'bold', color: activeTab === 'estimator' ? '#3b82f6' : '#64748b', borderBottom: activeTab === 'estimator' ? '3px solid #3b82f6' : '3px solid transparent', cursor: 'pointer' }}
                    >
                        New Estimate
                    </button>
                    <button
                        onClick={() => {
                            setActiveTab('history');
                            fetchHistory(); // Fetches data exactly when clicked
                        }}
                        style={{ padding: '0.5rem 1rem', border: 'none', background: 'none', fontSize: '16px', fontWeight: 'bold', color: activeTab === 'history' ? '#3b82f6' : '#64748b', borderBottom: activeTab === 'history' ? '3px solid #3b82f6' : '3px solid transparent', cursor: 'pointer' }}
                    >
                        Claim History
                    </button>
                </div>

                {/* ESTIMATOR VIEW */}
                {activeTab === 'estimator' && (
                    <>
                        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                            <div style={{ flex: 1, textAlign: 'left' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: '#475569', fontSize: '14px' }}>Car Make</label>
                                <select value={carMake} onChange={(e) => setCarMake(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}>
                                    <option value="Dacia">Dacia</option>
                                    <option value="Ford">Ford</option>
                                    <option value="Volkswagen">Volkswagen</option>
                                    <option value="Audi">Audi</option>
                                    <option value="BMW">BMW</option>
                                    <option value="Mercedes-Benz">Mercedes-Benz</option>
                                </select>
                            </div>
                            <div style={{ flex: 1, textAlign: 'left' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: '#475569', fontSize: '14px' }}>Year</label>
                                <input type="number" min="1990" max="2026" value={carYear} onChange={(e) => setCarYear(parseInt(e.target.value))} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }} />
                            </div>
                        </div>

                        <div style={{ border: '2px dashed #cbd5e1', borderRadius: '12px', padding: '2rem', marginBottom: '1.5rem', backgroundColor: '#f8fafc' }}>
                            <input type="file" accept="image/*" onChange={handleFileChange} style={{ margin: '0 auto', display: 'block', color: '#475569' }} />
                        </div>

                        <button
                            onClick={handleUpload}
                            disabled={!file || loading}
                            style={{ width: '100%', padding: '1rem', fontSize: '1.1rem', fontWeight: '600', cursor: (!file || loading) ? 'not-allowed' : 'pointer', backgroundColor: (!file || loading) ? '#93c5fd' : '#3b82f6', color: '#ffffff', border: 'none', borderRadius: '8px', marginBottom: '2rem' }}
                        >
                            {loading ? 'Analyzing...' : 'Estimate Damage'}
                        </button>

                        {/* RESULTS SECTION */}
                        {result && previewUrl && (
                            <div style={{ padding: '20px', backgroundColor: '#ffffff', borderRadius: '8px' }}>

                                {/* IMAGE WRAPPER (Targeted for PDF screenshot) */}
                                <div ref={imageRef} style={{ position: 'relative', display: 'inline-block', width: '100%', borderRadius: '8px', overflow: 'hidden' }}>
                                    <img src={previewUrl} alt="Vehicle Preview" style={{ width: '100%', height: 'auto', display: 'block' }} />
                                    {result?.detected_damages?.map((damage, index) => {
                                        if (!damage.bounding_box) return null;
                                        return (
                                            <div key={index} style={{ position: 'absolute', top: `${damage.bounding_box.y1 * 100}%`, left: `${damage.bounding_box.x1 * 100}%`, width: `${(damage.bounding_box.x2 - damage.bounding_box.x1) * 100}%`, height: `${(damage.bounding_box.y2 - damage.bounding_box.y1) * 100}%`, border: '3px solid #ef4444', backgroundColor: 'rgba(239, 68, 68, 0.2)', pointerEvents: 'none' }}>
                                                <span style={{ position: 'absolute', top: '-24px', left: '-3px', backgroundColor: '#ef4444', color: '#ffffff', fontSize: '12px', fontWeight: 'bold', padding: '2px 8px', borderRadius: '4px 4px 4px 0', whiteSpace: 'nowrap', textTransform: 'capitalize' }}>
                                                    {damage.part.replace(/-/g, ' ')}
                                                </span>
                                            </div>
                                        )
                                    })}
                                </div>

                                {/* ITEMIZED TEXT RESULTS */}
                                <div style={{ marginTop: '2rem', textAlign: 'left' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                        <h3 style={{ margin: 0, color: '#0f172a' }}>Official Damage Estimate</h3>
                                        <span style={{ padding: '4px 12px', backgroundColor: '#e0f2fe', color: '#0369a1', borderRadius: '16px', fontSize: '14px', fontWeight: 'bold' }}>{result.message}</span>
                                    </div>
                                    {result.detected_damages && result.detected_damages.length > 0 && (
                                        <ul style={{ listStyleType: 'none', padding: 0, margin: '0 0 1.5rem 0' }}>
                                            {result.detected_damages.map((damage, index) => (
                                                <li key={index} style={{ padding: '16px', marginBottom: '12px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', borderLeft: '4px solid #3b82f6' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <span style={{ textTransform: 'capitalize', fontWeight: '600', color: '#1e293b' }}>{damage.part.replace(/-/g, ' ')}</span>
                                                        <strong style={{ color: '#0f172a', fontSize: '1.1rem' }}>{damage.estimated_cost} RON</strong>
                                                    </div>
                                                    <ConfidenceBar confidence={damage.confidence} />
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                    <div style={{ borderTop: '2px solid #cbd5e1', paddingTop: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontWeight: '600', color: '#475569', fontSize: '1.1rem' }}>Total Estimated Cost:</span>
                                        <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#ef4444' }}>{result.total_estimated_cost} RON</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* DOWNLOAD PDF BUTTON */}
                        {result && (
                            <button
                                onClick={generatePDF}
                                style={{ marginTop: '1rem', width: '100%', padding: '1rem', fontSize: '1.1rem', fontWeight: '600', cursor: 'pointer', backgroundColor: '#10b981', color: '#ffffff', border: 'none', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.3)' }}
                            >
                                📥 Download Official PDF Estimate
                            </button>
                        )}
                    </>
                )}

                {/* HISTORY VIEW */}
                {activeTab === 'history' && (
                    <div style={{ textAlign: 'left' }}>
                        <h3 style={{ marginTop: 0, marginBottom: '1.5rem', color: '#0f172a' }}>Recent Claims</h3>
                        {loadingHistory ? (
                            <p style={{ color: '#64748b' }}>Loading history...</p>
                        ) : history.length === 0 ? (
                            <p style={{ color: '#64748b' }}>No claims recorded yet.</p>
                        ) : (
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                                    <thead>
                                        <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #cbd5e1', color: '#475569' }}>
                                            <th style={{ padding: '12px', textAlign: 'left' }}>Date</th>
                                            <th style={{ padding: '12px', textAlign: 'left' }}>Vehicle</th>
                                            <th style={{ padding: '12px', textAlign: 'left' }}>Damages</th>
                                            <th style={{ padding: '12px', textAlign: 'right' }}>Total Cost</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {history.map((record) => (
                                            <tr key={record.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                                <td style={{ padding: '12px', color: '#64748b' }}>{record.scan_date}</td>
                                                <td style={{ padding: '12px', fontWeight: 'bold', color: '#1e293b' }}>{record.car_make} ({record.car_year})</td>
                                                <td style={{ padding: '12px', color: '#475569' }}>{record.damage_summary}</td>
                                                <td style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold', color: '#ef4444' }}>{record.total_cost} RON</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}

export default App