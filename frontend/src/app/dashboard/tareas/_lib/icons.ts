import {
  MessageCircle,
  Phone,
  Mail,
  Users,
  Trophy,
  FileText,
  Globe,
  Gift,
  FlaskConical,
  Calendar,
  Sparkles,
  Flame,
  Swords,
  Shield,
  Zap,
  Star,
  Target,
  Crosshair,
  TrendingUp,
  Rocket,
  Crown,
  Tag,
  Eye,
  Send,
  Handshake,
  Gem,
  Award,
  Medal,
  Sword,
  Activity,
  // Companion
  Egg, Bird, Wand2, Sun,
  // Chest tiers
  Package, Box,
  // Slot symbols
  Cherry, Citrus,
  // Kingdom buildings
  Home, Store, Wheat, Trees, Landmark, Building2, Castle, Mountain, Church, Hammer,
  // Tarot symbols
  Pencil, Repeat, Infinity as InfinityIcon, Feather, Moon, Compass, Flower2, Leaf, Anchor, Smile, Sunrise, AlertTriangle, CircleDashed, ArrowRight,
  // Dinero
  Coins, Banknote, Diamond, PiggyBank,
  // Reino extendido
  Warehouse, Factory, Tent, TreePine, Tractor, GraduationCap,
  // Saga / Empire
  Skull, Drama, KeyRound, Telescope, Library, Ship,
  // Mastery
  GaugeCircle, BookOpen, Atom, Layers,
  // Companions extended
  Cat, Dog, Rabbit, Fish,
  // Tarot extra
  Hexagon, Triangle, ChevronsUp, Cloud, Wind, Snowflake,
  type LucideIcon,
} from 'lucide-react';
import type { Rareza, Categoria } from './types';

/* ============================================================
   Iconos + rarezas + categorías
============================================================ */

export const ICON_MAP: Record<string, LucideIcon> = {
  MessageCircle, Phone, Mail, Users, Trophy, FileText, Globe, Gift,
  FlaskConical, Calendar, Sparkles, Swords, Shield, Star, Zap,
  Target, Crosshair, TrendingUp, Rocket, Crown, Tag, Eye, Send,
  Handshake, Flame, Award, Medal,
  // Companion
  Egg, Bird, Wand2, Sun,
  // Chests
  Package, Box, Gem,
  // Slot
  Cherry, Citrus,
  // Kingdom
  Home, Store, Wheat, Trees, Landmark, Building2, Castle, Mountain, Church, Hammer,
  // Tarot
  Pencil, Repeat, Feather, Moon, Compass, Flower2, Leaf, Anchor, Smile, Sunrise, AlertTriangle, CircleDashed, ArrowRight, Sword,
  // Infinity (renombrado para evitar choque con tipo global)
  Infinity: InfinityIcon,
  // Dinero
  Coins, Banknote, Diamond, PiggyBank,
  // Edificios extra
  Warehouse, Factory, Tent, TreePine, Tractor, GraduationCap,
  // Saga / Empire
  Skull, Drama, KeyRound, Telescope, Library, Ship,
  // Mastery
  GaugeCircle, BookOpen, Atom, Layers,
  // Companions
  Cat, Dog, Rabbit, Fish,
  // Tarot extras
  Hexagon, Triangle, ChevronsUp, Cloud, Wind, Snowflake,
};

export const RAREZA_INFO: Record<Rareza, { label: string; ring: string; bg: string; text: string; glow: string; border: string }> = {
  comun: {
    label: 'Común',
    ring: 'ring-slate-400/30',
    bg: 'from-slate-500/10 to-slate-400/5',
    text: 'text-slate-400',
    glow: 'shadow-slate-500/10',
    border: 'border-slate-400/20',
  },
  raro: {
    label: 'Raro',
    ring: 'ring-blue-400/40',
    bg: 'from-blue-500/15 to-cyan-500/5',
    text: 'text-blue-400',
    glow: 'shadow-blue-500/20',
    border: 'border-blue-400/30',
  },
  epico: {
    label: 'Épico',
    ring: 'ring-violet-400/50',
    bg: 'from-violet-500/20 to-fuchsia-500/10',
    text: 'text-violet-400',
    glow: 'shadow-violet-500/25',
    border: 'border-violet-400/40',
  },
  legendario: {
    label: 'Legendario',
    ring: 'ring-amber-400/60',
    bg: 'from-amber-500/25 to-orange-500/15',
    text: 'text-amber-400',
    glow: 'shadow-amber-500/30',
    border: 'border-amber-400/50',
  },
  mitico: {
    label: 'Mítico',
    ring: 'ring-rose-400/70',
    bg: 'from-rose-500/30 via-fuchsia-500/20 to-amber-500/10',
    text: 'text-rose-400',
    glow: 'shadow-rose-500/40',
    border: 'border-rose-400/60',
  },
};

export const CATEGORIA_INFO: Record<Categoria, { label: string; icon: LucideIcon; color: string; accent: string }> = {
  comunicacion: { label: 'Comunicación', icon: MessageCircle, color: 'text-emerald-500', accent: 'from-emerald-500/20 to-emerald-500/0' },
  cazador: { label: 'Cazador', icon: Target, color: 'text-blue-500', accent: 'from-blue-500/20 to-blue-500/0' },
  ventas: { label: 'Ventas', icon: TrendingUp, color: 'text-amber-500', accent: 'from-amber-500/20 to-amber-500/0' },
  marketing: { label: 'Marketing', icon: Rocket, color: 'text-fuchsia-500', accent: 'from-fuchsia-500/20 to-fuchsia-500/0' },
  productividad: { label: 'Productividad', icon: Activity, color: 'text-cyan-500', accent: 'from-cyan-500/20 to-cyan-500/0' },
};
