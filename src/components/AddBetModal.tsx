import React, { useState } from 'react'
import { useBets } from '../context/BetContext'
import type { BetCondition, SportType } from '../types/bet'
import { POPULAR_BOOKMAKERS } from '../data/bookmakers'
import {
  parseInputToDecimal,
  type OddsFormat,
  decimalToAmerican,
  decimalToFractional,
  decimalToImpliedProbability,
  convertOddsInput
} from '../utils/odds'
import { X, Plus, Trash2, Zap, Sparkles, Radio, Calendar } from 'lucide-react'

interface AddBetModalProps {
  isOpen: boolean
  onClose: () => void
}

export const AddBetModal: React.FC<AddBetModalProps> = ({ isOpen, onClose }) => {
  const { addBet, oddsFormat: globalOddsFormat } = useBets()

  const [matchStatus, setMatchStatus] = useState<'LIVE' | 'PENDING'>('LIVE')
  const [sport, setSport] = useState<SportType>('football')
  const [league, setLeague] = useState('UEFA Champions League')
  const [homeTeam, setHomeTeam] = useState('')
  const [awayTeam, setAwayTeam] = useState('')
  const [betType, setBetType] = useState<'single' | 'parlay' | 'bet_builder'>('bet_builder')
  const [stake, setStake] = useState('25')
  const [inputOddsFormat, setInputOddsFormat] = useState<OddsFormat>(globalOddsFormat || 'decimal')
  const [oddsInput, setOddsInput] = useState('3.50')
  const [bookmaker, setBookmaker] = useState('Betsson')
  const [bookmakerRegion, setBookmakerRegion] = useState<'AR' | 'GLOBAL'>('AR')


  // Conditions list
  const [conditions, setConditions] = useState<Omit<BetCondition, 'id'>[]>([
    {
      market: 'Goles Totales',
      selection: 'Más de 2.5 Goles',
      targetValue: 2.5,
      currentValue: 1,
      progress: 40,
      unit: 'goles',
      status: 'IN_PROGRESS',
      isLock: false
    },
    {
      market: 'Córners Totales',
      selection: 'Más de 8.5 Córners',
      targetValue: 8.5,
      currentValue: 4,
      progress: 47,
      unit: 'córners',
      status: 'IN_PROGRESS',
      isLock: false
    }
  ])

  if (!isOpen) return null

  const handleAddCondition = () => {
    setConditions([
      ...conditions,
      {
        market: 'Selección Personalizada',
        selection: 'Nueva Condición',
        targetValue: 1,
        currentValue: 0,
        progress: 0,
        status: 'PENDING',
        isLock: false
      }
    ])
  }

  const handleRemoveCondition = (index: number) => {
    setConditions(conditions.filter((_, i) => i !== index))
  }

  const handleConditionChange = (index: number, field: string, value: any) => {
    setConditions(prev => {
      const copy = [...prev]
      copy[index] = { ...copy[index], [field]: value }

      // Auto update progress if numeric
      if (field === 'currentValue' || field === 'targetValue') {
        const cur = Number(copy[index].currentValue) || 0
        const tar = Number(copy[index].targetValue) || 1
        copy[index].progress = Math.min(100, Math.round((cur / tar) * 100))
        copy[index].status = cur >= tar ? 'MET' : (matchStatus === 'PENDING' ? 'PENDING' : 'IN_PROGRESS')
        copy[index].isLock = cur >= tar
      }
      return copy
    })
  }

  const handleFormatChange = (newFormat: OddsFormat) => {
    if (newFormat === inputOddsFormat) return
    const converted = convertOddsInput(oddsInput, inputOddsFormat, newFormat)
    setInputOddsFormat(newFormat)
    if (converted) {
      setOddsInput(converted)
    }
  }

  const addPreset = (market: string, selection: string, targetValue: number, unit: string) => {
    setConditions([
      ...conditions,
      {
        market,
        selection,
        targetValue,
        currentValue: 0,
        progress: 0,
        unit,
        status: matchStatus === 'PENDING' ? 'PENDING' : 'IN_PROGRESS',
        isLock: false
      }
    ])
  }

  const decimalOdds = parseInputToDecimal(oddsInput, inputOddsFormat)
  const parsedStake = parseFloat(stake) || 0
  const potentialPayout = parseFloat((parsedStake * decimalOdds).toFixed(2))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const isLive = matchStatus === 'LIVE'

    const mappedConditions: BetCondition[] = conditions.map((c, i) => ({
      ...c,
      id: `cond-${Date.now()}-${i}`,
      status: c.status === 'MET' ? 'MET' : (isLive ? 'IN_PROGRESS' : 'PENDING')
    }))

    addBet({
      title: `${homeTeam || 'Equipo 1'} vs ${awayTeam || 'Equipo 2'} // ${betType.toUpperCase()}`,
      sport,
      league: league || 'Liga Principal',
      type: betType,
      match: {
        homeTeam: homeTeam || 'Equipo Local',
        awayTeam: awayTeam || 'Equipo Visitante',
        homeScore: isLive ? 0 : undefined,
        awayScore: isLive ? 0 : undefined,
        minute: isLive ? "01'" : undefined,
        period: isLive ? '1H' : 'PRE',
        status: isLive ? 'LIVE' : 'SCHEDULED',
        startTime: new Date().toISOString(),
        league: league || 'Liga Principal'
      },
      stake: parsedStake,
      odds: decimalOdds,
      potentialPayout,
      bookmaker: bookmaker || 'Bet365',
      status: isLive ? 'LIVE' : 'PENDING',
      cashoutValue: isLive ? parsedStake * 0.9 : null,
      conditions: mappedConditions,
      notes: '',
      tags: [sport, betType, bookmaker]
    })

    onClose()
  }

  const getOddsPlaceholder = () => {
    switch (inputOddsFormat) {
      case 'american':
        return '+150 o -110'
      case 'fractional':
        return '3/2 o 5/4'
      case 'implied':
        return '40%'
      case 'decimal':
      default:
        return '2.50'
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="faceit-card border border-white/15 w-full max-w-2xl rounded-lg shadow-2xl p-5 md:p-6 my-8 text-slate-200">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded bg-orange-500/20 text-[#FF5500]">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white uppercase tracking-wider font-mono">
                Registrar Nueva Apuesta
              </h2>
              <p className="text-xs text-slate-400">
                Configura los mercados, cuotas en cualquier formato y condiciones
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Match Status Selector (En Vivo vs Pre-Partido) */}
          <div className="flex bg-[#0B0C10] p-1 rounded-lg border border-white/10 text-xs font-mono">
            <button
              type="button"
              onClick={() => setMatchStatus('LIVE')}
              className={`flex-1 py-1.5 rounded-md transition-all font-bold flex items-center justify-center gap-1.5 ${
                matchStatus === 'LIVE'
                  ? 'bg-red-600 text-white shadow-sm shadow-red-950/50'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Radio className={`w-3.5 h-3.5 ${matchStatus === 'LIVE' ? 'animate-pulse' : ''}`} />
              <span>En Vivo (Comenzó)</span>
            </button>
            <button
              type="button"
              onClick={() => setMatchStatus('PENDING')}
              className={`flex-1 py-1.5 rounded-md transition-all font-bold flex items-center justify-center gap-1.5 ${
                matchStatus === 'PENDING'
                  ? 'bg-[#FF5500] text-white shadow-sm shadow-orange-950/50'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Pre-Partido (Programado)</span>
            </button>
          </div>

          {/* Match & Sport info */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Deporte
              </label>
              <select
                value={sport}
                onChange={(e) => setSport(e.target.value as SportType)}
                className="w-full bg-[#0B0C10] border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-[#FF5500] focus:outline-none"
              >
                <option value="football">⚽ Fútbol</option>
                <option value="basketball">🏀 Baloncesto</option>
                <option value="tennis">🎾 Tenis</option>
                <option value="esports">🎮 Esports</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Tipo de Apuesta
              </label>
              <select
                value={betType}
                onChange={(e) => setBetType(e.target.value as any)}
                className="w-full bg-[#0B0C10] border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-[#FF5500] focus:outline-none"
              >
                <option value="bet_builder">🔥 Bet Builder (Mismo partido)</option>
                <option value="parlay">⚡ Parlay / Combinada</option>
                <option value="single">Simple (1 selección)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Liga / Competición
              </label>
              <input
                type="text"
                value={league}
                onChange={(e) => setLeague(e.target.value)}
                placeholder="ej. Champions League, NBA"
                className="w-full bg-[#0B0C10] border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-[#FF5500] focus:outline-none"
              />
            </div>
          </div>

          {/* Teams / Event */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Equipo Local / Jugador 1
              </label>
              <input
                type="text"
                required
                value={homeTeam}
                onChange={(e) => setHomeTeam(e.target.value)}
                placeholder="ej. Barcelona, Lakers, Alcaraz"
                className="w-full bg-[#0B0C10] border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-[#FF5500] focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Equipo Visitante / Jugador 2
              </label>
              <input
                type="text"
                required
                value={awayTeam}
                onChange={(e) => setAwayTeam(e.target.value)}
                placeholder="ej. PSG, Warriors, Sinner"
                className="w-full bg-[#0B0C10] border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-[#FF5500] focus:outline-none"
              />
            </div>
          </div>

          {/* Odds Format Selector Tabs & Form Row */}
          <div className="bg-[#0B0C10] p-3.5 rounded border border-white/10 space-y-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-white/5 pb-2">
              <span className="text-xs font-bold text-orange-400 uppercase tracking-wider font-mono">
                Formato de Cuota:
              </span>
              <div className="flex items-center bg-[#161822] border border-white/10 rounded p-0.5 text-[11px] font-mono">
                <button
                  type="button"
                  onClick={() => handleFormatChange('decimal')}
                  className={`px-2.5 py-1 rounded transition-all ${
                    inputOddsFormat === 'decimal'
                      ? 'bg-[#FF5500] text-white font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Decimal (2.50)
                </button>
                <button
                  type="button"
                  onClick={() => handleFormatChange('american')}
                  className={`px-2.5 py-1 rounded transition-all ${
                    inputOddsFormat === 'american'
                      ? 'bg-[#FF5500] text-white font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Americana (+150)
                </button>
                <button
                  type="button"
                  onClick={() => handleFormatChange('fractional')}
                  className={`px-2.5 py-1 rounded transition-all ${
                    inputOddsFormat === 'fractional'
                      ? 'bg-[#FF5500] text-white font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Fraccional (3/2)
                </button>
                <button
                  type="button"
                  onClick={() => handleFormatChange('implied')}
                  className={`px-2.5 py-1 rounded transition-all ${
                    inputOddsFormat === 'implied'
                      ? 'bg-[#FF5500] text-white font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Prob % (40%)
                </button>
              </div>
            </div>

            {/* Bookmaker Selector (Argentina & Global) */}
            <div className="pt-2 border-t border-white/5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider font-mono flex items-center gap-1">
                  <span>Casa de Apuestas:</span>
                  <span className="text-orange-400 font-bold">{bookmaker}</span>
                </span>

                <div className="flex items-center bg-[#161822] p-0.5 rounded text-[10px] font-mono border border-white/10">
                  <button
                    type="button"
                    onClick={() => setBookmakerRegion('AR')}
                    className={`px-2 py-0.5 rounded transition-all ${
                      bookmakerRegion === 'AR' ? 'bg-[#FF5500] text-white font-bold' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    🇦🇷 Argentina
                  </button>
                  <button
                    type="button"
                    onClick={() => setBookmakerRegion('GLOBAL')}
                    className={`px-2 py-0.5 rounded transition-all ${
                      bookmakerRegion === 'GLOBAL' ? 'bg-[#FF5500] text-white font-bold' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    🌐 Global / Crypto
                  </button>
                </div>
              </div>

              <div className="flex gap-1.5 flex-wrap">
                {POPULAR_BOOKMAKERS.filter(b => bookmakerRegion === 'AR' ? b.region === 'AR' : (b.region === 'GLOBAL' || b.region === 'CRYPTO')).map(b => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setBookmaker(b.shortName)}
                    className={`px-2.5 py-1 rounded text-xs font-semibold transition-all border ${
                      bookmaker.toLowerCase() === b.shortName.toLowerCase()
                        ? 'bg-orange-500/20 text-[#FF5500] border-[#FF5500] font-bold shadow-sm'
                        : 'bg-[#161822] text-slate-300 border-white/5 hover:border-white/20'
                    }`}
                  >
                    {b.badgeLabel}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-400 uppercase block mb-1">
                  Stake ($)
                </label>
                <input
                  type="number"
                  step="0.5"
                  required
                  value={stake}
                  onChange={(e) => setStake(e.target.value)}
                  className="w-full bg-[#161822] border border-white/10 rounded px-2.5 py-1.5 text-sm text-white font-mono-numbers font-bold focus:border-[#FF5500] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400 uppercase block mb-1">
                  Cuota ({inputOddsFormat.toUpperCase()})
                </label>
                <input
                  type="text"
                  required
                  placeholder={getOddsPlaceholder()}
                  value={oddsInput}
                  onChange={(e) => setOddsInput(e.target.value)}
                  className="w-full bg-[#161822] border border-white/10 rounded px-2.5 py-1.5 text-sm text-orange-400 font-mono-numbers font-bold focus:border-[#FF5500] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400 uppercase block mb-1">
                  Otra Casa (Escribir)
                </label>
                <input
                  type="text"
                  value={bookmaker}
                  onChange={(e) => setBookmaker(e.target.value)}
                  placeholder="ej. Betsson, Stake, 1xBet..."
                  className="w-full bg-[#161822] border border-white/10 rounded px-2.5 py-1.5 text-sm text-white focus:border-[#FF5500] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400 uppercase block mb-1">
                  Retorno Máximo
                </label>
                <div className="px-2.5 py-1.5 bg-emerald-950/40 border border-emerald-500/30 rounded text-emerald-400 font-mono-numbers font-extrabold text-sm">
                  ${potentialPayout.toFixed(2)}
                </div>
              </div>
            </div>

            {/* Real-time Multi-Format Odds Live Conversion Bar */}
            <div className="bg-[#12141C] p-2 rounded border border-white/5 flex items-center justify-between text-[11px] font-mono flex-wrap gap-2 text-slate-400">
              <span className="text-slate-500 uppercase text-[10px]">Equivalencias:</span>
              <span>Decimal: <strong className="text-white font-mono-numbers">{decimalOdds.toFixed(2)}</strong></span>
              <span>Americana: <strong className="text-orange-400 font-mono-numbers">{decimalToAmerican(decimalOdds)}</strong></span>
              <span>Fraccional: <strong className="text-cyan-400 font-mono-numbers">{decimalToFractional(decimalOdds)}</strong></span>
              <span>Probabilidad: <strong className="text-emerald-400 font-mono-numbers">{decimalToImpliedProbability(decimalOdds)}</strong></span>
            </div>
          </div>

          {/* Quick Presets for Conditions */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-orange-400" />
                Presets Rápidos
              </span>
            </div>
            <div className="flex gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => addPreset('Goles Totales', '+2.5 Goles', 2.5, 'goles')}
                className="px-2.5 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded text-[11px] text-slate-300"
              >
                +2.5 Goles
              </button>
              <button
                type="button"
                onClick={() => addPreset('Córners Totales', '+8.5 Córners', 8.5, 'córners')}
                className="px-2.5 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded text-[11px] text-slate-300"
              >
                +8.5 Córners
              </button>
              <button
                type="button"
                onClick={() => addPreset('Tarjetas Totales', '+3.5 Tarjetas', 3.5, 'tarjetas')}
                className="px-2.5 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded text-[11px] text-slate-300"
              >
                +3.5 Tarjetas
              </button>
              <button
                type="button"
                onClick={() => addPreset('Tiros a Puerta', 'Jugador 1+ Tiro al arco', 1, 'tiros')}
                className="px-2.5 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded text-[11px] text-slate-300"
              >
                1+ Tiro a puerta
              </button>
            </div>
          </div>

          {/* Conditions List */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-orange-400 uppercase tracking-wider font-mono">
                Condiciones del Tracker ({conditions.length})
              </label>
              <button
                type="button"
                onClick={handleAddCondition}
                className="flex items-center gap-1 text-xs font-mono font-bold text-[#FF5500] hover:text-orange-400"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Añadir Condición</span>
              </button>
            </div>

            {conditions.map((c, idx) => (
              <div key={idx} className="p-3 bg-[#0B0C10] rounded border border-white/10 flex flex-col sm:flex-row gap-2.5 items-start sm:items-center">
                <input
                  type="text"
                  placeholder="Mercado (ej. Córners)"
                  value={c.market}
                  onChange={(e) => handleConditionChange(idx, 'market', e.target.value)}
                  className="bg-[#161822] border border-white/10 rounded px-2.5 py-1.5 text-xs text-white sm:w-1/3 focus:border-[#FF5500] focus:outline-none"
                />

                <input
                  type="text"
                  placeholder="Selección (ej. +8.5 Córners)"
                  value={c.selection}
                  onChange={(e) => handleConditionChange(idx, 'selection', e.target.value)}
                  className="bg-[#161822] border border-white/10 rounded px-2.5 py-1.5 text-xs text-white sm:w-1/3 focus:border-[#FF5500] focus:outline-none"
                />

                <div className="flex items-center gap-1.5 sm:w-1/3 justify-end">
                  <div className="flex items-center gap-1 text-xs font-mono">
                    <input
                      type="number"
                      step="0.5"
                      placeholder="Actual"
                      value={c.currentValue}
                      onChange={(e) => handleConditionChange(idx, 'currentValue', parseFloat(e.target.value) || 0)}
                      className="w-14 bg-[#161822] border border-white/10 rounded px-1.5 py-1.5 text-xs text-white text-center font-mono-numbers"
                    />
                    <span>/</span>
                    <input
                      type="number"
                      step="0.5"
                      placeholder="Meta"
                      value={c.targetValue}
                      onChange={(e) => handleConditionChange(idx, 'targetValue', parseFloat(e.target.value) || 1)}
                      className="w-14 bg-[#161822] border border-white/10 rounded px-1.5 py-1.5 text-xs text-orange-400 text-center font-mono-numbers font-bold"
                    />
                  </div>

                  {conditions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveCondition(idx)}
                      className="p-1.5 text-slate-500 hover:text-red-400"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Submit Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded text-xs font-semibold uppercase text-slate-400 hover:text-white"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded bg-[#FF5500] hover:bg-[#FF661A] text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-orange-950/40 active:scale-95 transition-all flex items-center gap-1.5"
            >
              <Zap className="w-4 h-4 fill-white" />
              <span>Guardar & Iniciar Tracker</span>
            </button>
          </div>

        </form>
      </div>
    </div>
  )
}
