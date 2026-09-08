import {
  ChatBubbleIcon,
  CodeIcon,
  BugIcon,
  ArchitectureIcon,
  WriteIcon,
  LightbulbIcon,
  SearchIcon,
  BriefcaseIcon,
  BrainIcon,
  BotIcon,
  UserIcon,
  SendIcon,
  StopIcon,
  PlusIcon,
  ChatIcon,
  TrashIcon,
  SettingsIcon,
  SunIcon,
  MoonIcon,
  CloseIcon,
  MenuIcon,
  ChevronDownIcon,
  EyeIcon,
  EyeOffIcon,
  CopyIcon,
  CheckIcon,
  DocumentIcon,
  ImageIcon,
} from './Icons';

const iconMap: Record<string, React.FC<React.SVGProps<SVGSVGElement>>> = {
  chat: ChatBubbleIcon,
  code: CodeIcon,
  developer: BrainIcon,
  business: BriefcaseIcon,
  search: SearchIcon,
  bug: BugIcon,
  architecture: ArchitectureIcon,
  write: WriteIcon,
  lightbulb: LightbulbIcon,
  bot: BotIcon,
  user: UserIcon,
  send: SendIcon,
  stop: StopIcon,
  plus: PlusIcon,
  chatIcon: ChatIcon,
  trash: TrashIcon,
  settings: SettingsIcon,
  sun: SunIcon,
  moon: MoonIcon,
  close: CloseIcon,
  menu: MenuIcon,
  chevronDown: ChevronDownIcon,
  eye: EyeIcon,
  eyeOff: EyeOffIcon,
  copy: CopyIcon,
  check: CheckIcon,
  document: DocumentIcon,
  image: ImageIcon,
  file: DocumentIcon,
  git: CodeIcon,
};

interface IconProps {
  name: string;
  className?: string;
}

export function Icon({ name, className = 'w-5 h-5' }: IconProps) {
  const IconComponent = iconMap[name];
  if (!IconComponent) {
    return <ChatBubbleIcon className={className} />;
  }
  return <IconComponent className={className} />;
}

export {
  ChatBubbleIcon,
  CodeIcon,
  BugIcon,
  ArchitectureIcon,
  WriteIcon,
  LightbulbIcon,
  SearchIcon,
  BriefcaseIcon,
  BrainIcon,
  BotIcon,
  UserIcon,
  SendIcon,
  StopIcon,
  PlusIcon,
  ChatIcon,
  TrashIcon,
  SettingsIcon,
  SunIcon,
  MoonIcon,
  CloseIcon,
  MenuIcon,
  ChevronDownIcon,
  EyeIcon,
  EyeOffIcon,
  CopyIcon,
  CheckIcon,
  DocumentIcon,
  ImageIcon,
};
