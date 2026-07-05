import { useState } from 'react'

interface BoundingBox {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
}

interface Damage {
    part: string;
    estimated_cost: number;
    confidence: number;
    bounding_box?: BoundingBox;
}

interface APIResult {
    status: string;
    message: string;
    total_estimated_cost?: number;
    detected_damages?: Damage[];
}

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
    const [file, setFile] = useState<File | null>(null)
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)
    const [carMake, setCarMake] = useState<string>('Ford')
    const [carYear, setCarYear] = useState<number>(2015)
    const [loading, setLoading] = useState<boolean>(false)
    const [result, setResult] = useState<APIResult | null>(null)

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

    return (
        <div style={{
            minHeight: '100vh',
            backgroundColor: '#e1f0fa',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'flex-start',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            padding: '2rem'
        }}>
            <div style={{
                backgroundColor: '#ffffff',
                padding: '3rem',
                borderRadius: '16px',
                boxShadow: '0 10px 25px rgba(0,0,0,0.08)',
                maxWidth: '650px',
                width: '100%',
                textAlign: 'center'
            }}>
                <h1 style={{ color: '#1a1a1a', margin: '0 0 0.5rem 0', fontSize: '36px' }}>AI Auto Damage Estimator</h1>

                {/* --- Formular Date Mașină --- */}
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div style={{ flex: 1, textAlign: 'left' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: '#475569', fontSize: '14px' }}>Car Make</label>
                        <select
                            value={carMake}
                            onChange={(e) => setCarMake(e.target.value)}
                            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}
                        >
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
                        <input
                            type="number"
                            min="1990"
                            max="2026"
                            value={carYear}
                            onChange={(e) => setCarYear(parseInt(e.target.value))}
                            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}
                        />
                    </div>
                </div>

                {/* --- Upload Imagine --- */}
                <div style={{
                    border: '2px dashed #cbd5e1',
                    borderRadius: '12px',
                    padding: '2rem',
                    marginBottom: '1.5rem',
                    backgroundColor: '#f8fafc',
                }}>
                    <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        style={{ margin: '0 auto', display: 'block', color: '#475569' }}
                    />
                </div>

                {/* --- Buton Analiză --- */}
                <button
                    onClick={handleUpload}
                    disabled={!file || loading}
                    style={{
                        width: '100%',
                        padding: '1rem',
                        fontSize: '1.1rem',
                        fontWeight: '600',
                        cursor: (!file || loading) ? 'not-allowed' : 'pointer',
                        backgroundColor: (!file || loading) ? '#93c5fd' : '#3b82f6',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '8px',
                        boxShadow: (!file || loading) ? 'none' : '0 4px 6px -1px rgba(59, 130, 246, 0.3)',
                        marginBottom: '2rem'
                    }}
                >
                    {loading ? 'Analyzing...' : 'Estimate Damage'}
                </button>

                {/* --- Vizualizare Imagine + Bounding Boxes --- */}
                {previewUrl && (
                    <div style={{ position: 'relative', display: 'inline-block', width: '100%', borderRadius: '8px', overflow: 'hidden' }}>
                        <img
                            src={previewUrl}
                            alt="Vehicle Preview"
                            style={{ width: '100%', height: 'auto', display: 'block' }}
                        />

                        {result?.detected_damages?.map((damage, index) => {
                            if (!damage.bounding_box) return null;

                            const top = `${damage.bounding_box.y1 * 100}%`;
                            const left = `${damage.bounding_box.x1 * 100}%`;
                            const width = `${(damage.bounding_box.x2 - damage.bounding_box.x1) * 100}%`;
                            const height = `${(damage.bounding_box.y2 - damage.bounding_box.y1) * 100}%`;

                            return (
                                <div key={index} style={{
                                    position: 'absolute',
                                    top: top,
                                    left: left,
                                    width: width,
                                    height: height,
                                    border: '3px solid #ef4444',
                                    backgroundColor: 'rgba(239, 68, 68, 0.2)',
                                    pointerEvents: 'none'
                                }}>
                                    <span style={{
                                        position: 'absolute',
                                        top: '-24px',
                                        left: '-3px',
                                        backgroundColor: '#ef4444',
                                        color: '#ffffff',
                                        fontSize: '12px',
                                        fontWeight: 'bold',
                                        padding: '2px 8px',
                                        borderRadius: '4px 4px 4px 0',
                                        whiteSpace: 'nowrap',
                                        textTransform: 'capitalize'
                                    }}>
                                        {damage.part.replace(/-/g, ' ')}
                                    </span>
                                </div>
                            )
                        })}
                    </div>
                )}

                {/* --- Secțiunea de Rezultate Text --- */}
                {result && (
                    <div style={{ marginTop: '2rem', textAlign: 'left' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h3 style={{ margin: 0, color: '#0f172a' }}>Analysis Result</h3>
                            <span style={{ padding: '4px 12px', backgroundColor: '#e0f2fe', color: '#0369a1', borderRadius: '16px', fontSize: '14px', fontWeight: 'bold' }}>
                                {result.message}
                            </span>
                        </div>

                        {result.detected_damages && result.detected_damages.length > 0 && (
                            <ul style={{ listStyleType: 'none', padding: 0, margin: '0 0 1.5rem 0' }}>
                                {result.detected_damages.map((damage, index) => (
                                    <li key={index} style={{
                                        padding: '16px',
                                        marginBottom: '12px',
                                        backgroundColor: '#f8fafc',
                                        borderRadius: '8px',
                                        border: '1px solid #e2e8f0',
                                        borderLeft: '4px solid #3b82f6'
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ textTransform: 'capitalize', fontWeight: '600', color: '#1e293b' }}>
                                                {damage.part.replace(/-/g, ' ')}
                                            </span>
                                            <strong style={{ color: '#0f172a', fontSize: '1.1rem' }}>
                                                {damage.estimated_cost} RON
                                            </strong>
                                        </div>
                                        <ConfidenceBar confidence={damage.confidence} />
                                    </li>
                                ))}
                            </ul>
                        )}

                        <div style={{ borderTop: '2px solid #cbd5e1', paddingTop: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: '600', color: '#475569', fontSize: '1.1rem' }}>Total Estimated Cost:</span>
                            <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#ef4444' }}>
                                {result.total_estimated_cost} RON
                            </span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

export default App