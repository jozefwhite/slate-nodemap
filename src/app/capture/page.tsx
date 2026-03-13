'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, Type, Loader2, X } from 'lucide-react';
import Header from '@/components/layout/Header';
import { useExploration } from '@/hooks/useExploration';
import { makeNode, makeEdge, computeChildPositions } from '@/lib/graph-utils';
import { ClassifyResponse } from '@/lib/types';

type Step = 'capture' | 'processing' | 'review';
type Mode = 'photo' | 'text';

export default function CapturePage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('capture');
  const [mode, setMode] = useState<Mode>('photo');
  const [textContent, setTextContent] = useState('');
  const [userNotes, setUserNotes] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [result, setResult] = useState<ClassifyResponse | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const { nodes, seedTerm, reset, setSeedTerm, addNodes } = useExploration();
  const hasJourney = nodes.length > 0;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be under 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setImagePreview(dataUrl);
      setImageBase64(dataUrl.split(',')[1]);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    setStep('processing');

    try {
      const body: Record<string, unknown> = {
        mode: hasJourney ? 'analyze' : 'classify',
        userNotes: userNotes || undefined,
      };

      if (mode === 'photo' && imageBase64) {
        body.imageBase64 = imageBase64;
      } else if (mode === 'text' && textContent) {
        body.text = textContent;
      }

      // Pass journey context if we have an active exploration
      if (hasJourney) {
        body.journeyContext = {
          seedTerm,
          recentNodes: nodes.slice(-10).map((n: { data: { label: string; summary?: string } }) => ({
            label: n.data.label,
            summary: n.data.summary,
          })),
        };
      }

      const res = await fetch('/api/classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data: ClassifyResponse = await res.json();
      setResult(data);
      setStep('review');
    } catch {
      setStep('capture');
    }
  };

  const addToJourney = () => {
    if (!result) return;

    // Find anchor node (last node in the graph)
    const anchorNode = nodes[nodes.length - 1];
    if (!anchorNode) return;

    const captureLabel = (userNotes || result.description).slice(0, 50) || 'Capture';
    const captureNode = makeNode(
      captureLabel,
      imageBase64 ? 'image' : 'user',
      {
        x: anchorNode.position.x + 300,
        y: anchorNode.position.y,
      },
      {
        summary: [result.description, result.analysis].filter(Boolean).join(' '),
        tags: result.tags,
        imageUrl: imagePreview || undefined,
        depth: anchorNode.data.depth + 1,
      }
    );

    const captureEdge = makeEdge(anchorNode.id, captureNode.id, 'captured');

    // Create related concept nodes with collision avoidance
    const relatedPositions = computeChildPositions(
      captureNode.position.x,
      captureNode.position.y,
      Math.min(result.relatedConcepts.length, 4),
      captureNode.data.depth,
      nodes,
    );

    const relatedNodes = result.relatedConcepts.slice(0, 4).map((concept, i) =>
      makeNode(concept, 'wikipedia', relatedPositions[i], {
        depth: captureNode.data.depth + 1,
      })
    );

    const relatedEdges = relatedNodes.map((n) =>
      makeEdge(captureNode.id, n.id, 'related')
    );

    addNodes([captureNode, ...relatedNodes], [captureEdge, ...relatedEdges]);
    router.push('/explore');
  };

  const startNewJourney = () => {
    if (!result) return;

    reset();
    const captureLabel = (userNotes || result.description).slice(0, 50) || 'Capture';
    setSeedTerm(captureLabel);

    const captureNode = makeNode(
      captureLabel,
      imageBase64 ? 'image' : 'user',
      { x: 0, y: 0 },
      {
        summary: result.description,
        tags: result.tags,
        imageUrl: imagePreview || undefined,
        depth: 0,
      }
    );

    const relatedPositions = computeChildPositions(
      0, 0,
      Math.min(result.relatedConcepts.length, 4),
      0,
    );

    const relatedNodes = result.relatedConcepts.slice(0, 4).map((concept, i) =>
      makeNode(concept, 'wikipedia', relatedPositions[i], { depth: 1 })
    );

    const relatedEdges = relatedNodes.map((n) =>
      makeEdge(captureNode.id, n.id, 'related')
    );

    addNodes([captureNode, ...relatedNodes], relatedEdges);
    router.push('/explore');
  };

  const resetCapture = () => {
    setStep('capture');
    setImagePreview(null);
    setImageBase64(null);
    setTextContent('');
    setUserNotes('');
    setResult(null);
  };

  return (
    <div className="min-h-screen flex flex-col bg-surface-0">
      <Header />

      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-sm">
          {/* Step 1: Capture */}
          {step === 'capture' && (
            <div className="space-y-6">
              <div className="text-center">
                <h1 className="text-sm font-medium text-ink-0 mb-1">capture</h1>
                <p className="text-2xs text-ink-3">add something to your knowledge graph</p>
              </div>

              {/* Mode toggle */}
              <div className="flex border border-surface-2">
                <button
                  onClick={() => setMode('photo')}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs transition-colors ${
                    mode === 'photo' ? 'bg-ink-0 text-white' : 'text-ink-3 hover:text-ink-1'
                  }`}
                >
                  <Camera size={16} /> photo
                </button>
                <button
                  onClick={() => setMode('text')}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs transition-colors ${
                    mode === 'text' ? 'bg-ink-0 text-white' : 'text-ink-3 hover:text-ink-1'
                  }`}
                >
                  <Type size={16} /> text
                </button>
              </div>

              {mode === 'photo' && (
                <div className="space-y-3">
                  {imagePreview ? (
                    <div className="relative">
                      <img src={imagePreview} alt="Preview" className="w-full aspect-video object-cover" />
                      <button
                        onClick={() => { setImagePreview(null); setImageBase64(null); }}
                        className="absolute top-2 right-2 bg-black/50 text-white p-1.5"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <button
                        onClick={() => cameraInputRef.current?.click()}
                        className="w-full py-4 border border-surface-2 text-sm text-ink-2 hover:bg-surface-1 transition-colors"
                      >
                        take a photo
                      </button>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full py-4 border border-surface-2 text-sm text-ink-2 hover:bg-surface-1 transition-colors"
                      >
                        choose from library
                      </button>
                    </div>
                  )}
                  <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>
              )}

              {mode === 'text' && (
                <textarea
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  placeholder="paste a quote, idea, URL, anything..."
                  className="w-full h-32 bg-surface-1 border border-surface-2 text-sm text-ink-1 p-4 placeholder:text-ink-3 focus:outline-none focus:border-ink-3 resize-none"
                />
              )}

              <textarea
                value={userNotes}
                onChange={(e) => setUserNotes(e.target.value)}
                placeholder="your context (optional but helps)"
                className="w-full h-20 bg-surface-1 border border-surface-2 text-sm text-ink-1 p-4 placeholder:text-ink-3 focus:outline-none focus:border-ink-3 resize-none"
              />

              {hasJourney && (
                <p className="text-2xs text-ink-3 text-center">
                  will analyze in context of your &lsquo;{seedTerm}&rsquo; journey
                </p>
              )}

              <button
                onClick={handleSubmit}
                disabled={mode === 'photo' ? !imageBase64 : !textContent.trim()}
                className="w-full py-3 bg-ink-0 text-white text-sm hover:bg-ink-1 disabled:opacity-30 transition-colors"
              >
                {hasJourney ? 'analyze in context' : 'classify'}
              </button>
            </div>
          )}

          {/* Step 2: Processing */}
          {step === 'processing' && (
            <div className="flex flex-col items-center gap-6 py-12">
              {imagePreview && (
                <img src={imagePreview} alt="Processing" className="w-40 h-40 object-cover opacity-40" />
              )}
              <Loader2 size={24} className="animate-spin text-ink-3" />
              <p className="text-xs text-ink-3">
                {hasJourney ? 'analyzing in the context of your journey...' : 'classifying your capture...'}
              </p>
            </div>
          )}

          {/* Step 3: Review */}
          {step === 'review' && result && (
            <div className="space-y-5">
              {imagePreview && (
                <img src={imagePreview} alt="Captured" className="w-full aspect-video object-cover" />
              )}

              <div>
                <p className="text-sm text-ink-1 leading-relaxed">{result.description}</p>
                {result.analysis && (
                  <p className="text-xs text-ink-2 leading-relaxed mt-1.5">{result.analysis}</p>
                )}
              </div>

              {result.tags.length > 0 && (
                <div className="flex gap-1 flex-wrap">
                  {result.tags.map((tag) => (
                    <span key={tag} className="text-2xs font-mono text-ink-3 bg-surface-1 px-2 py-1">
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {result.relatedConcepts.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-2xs font-mono uppercase tracking-wider text-ink-3">
                    related concepts
                  </span>
                  {result.relatedConcepts.map((concept) => (
                    <div key={concept} className="flex items-center gap-2 text-xs text-ink-2">
                      <div className="w-1.5 h-1.5 bg-node-wikipedia" />
                      {concept}
                    </div>
                  ))}
                </div>
              )}

              {userNotes && (
                <div>
                  <span className="text-2xs font-mono uppercase tracking-wider text-ink-3 block mb-1">
                    your notes
                  </span>
                  <p className="text-xs text-ink-2">{userNotes}</p>
                </div>
              )}

              <div className="space-y-2 pt-2">
                {hasJourney && (
                  <button
                    onClick={addToJourney}
                    className="w-full py-3 bg-ink-0 text-white text-sm hover:bg-ink-1 transition-colors"
                  >
                    add to current journey
                  </button>
                )}
                <button
                  onClick={startNewJourney}
                  className={`w-full py-3 text-sm transition-colors ${
                    hasJourney
                      ? 'border border-surface-2 text-ink-2 hover:bg-surface-1'
                      : 'bg-ink-0 text-white hover:bg-ink-1'
                  }`}
                >
                  start new journey
                </button>
                <button
                  onClick={resetCapture}
                  className="w-full py-2 text-xs text-ink-3 hover:text-ink-1 transition-colors"
                >
                  start over
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
