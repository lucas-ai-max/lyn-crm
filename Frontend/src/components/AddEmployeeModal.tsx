
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Copy, Eye, EyeOff, CheckCircle2, AlertCircle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'

interface EmployeeCredentials {
    email: string
    temporary_password: string
    full_name: string
}

export function AddEmployeeModal({
    open,
    onOpenChange,
    onSuccess
}: {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess?: () => void
}) {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [fullName, setFullName] = useState('')
    const [role, setRole] = useState<'user' | 'admin'>('user')
    const [showPassword, setShowPassword] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [credentials, setCredentials] = useState<EmployeeCredentials | null>(null)
    const [credentialsCopied, setCredentialsCopied] = useState(false)
    const { toast } = useToast()

    // Gerar senha forte
    const generatePassword = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%'
        const length = 12
        let pass = ''
        for (let i = 0; i < length; i++) {
            pass += chars.charAt(Math.floor(Math.random() * chars.length))
        }
        setPassword(pass)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)

        try {
            // Split full name into first and last name
            const names = fullName.trim().split(' ');
            const firstName = names[0];
            const lastName = names.length > 1 ? names.slice(1).join(' ') : '';

            const { data, error } = await supabase.functions.invoke('create-employee', {
                body: {
                    email,
                    password,
                    firstName,
                    lastName,
                    role
                }
            })

            if (error) {
                // Parse error message if possible
                const errorMessage = error.message || 'Erro ao criar funcionário'
                // Try to parse body if it's a 400 with json
                throw new Error(errorMessage)
            }

            if (data?.error) {
                throw new Error(data.error)
            }

            // Sucesso
            setCredentials({
                email: data.employee.email,
                temporary_password: data.employee.temporary_password,
                full_name: data.employee.full_name
            })

            toast({
                title: 'Funcionário criado!',
                description: 'Credenciais geradas com sucesso.',
            })

            if (onSuccess) onSuccess();

        } catch (error: any) {
            toast({
                title: 'Erro',
                description: error.message || "Erro desconhecido",
                variant: 'destructive'
            })
        } finally {
            setIsLoading(false)
        }
    }

    const copyCredentials = async () => {
        if (!credentials) return

        const text = `
CRM - Credenciais de Acesso
========================
Nome: ${credentials.full_name}
Email: ${credentials.email}
Senha: ${credentials.temporary_password}

⚠️ Guarde estas credenciais em local seguro!
    `.trim()

        await navigator.clipboard.writeText(text)
        setCredentialsCopied(true)

        toast({
            title: 'Copiado!',
            description: 'Credenciais copiadas para a área de transferência.',
        })
    }

    const handleClose = () => {
        if (credentials && !credentialsCopied) {
            if (!confirm('Você ainda não copiou as credenciais. Tem certeza que deseja fechar?')) {
                return
            }
        }

        // Reset
        setEmail('')
        setPassword('')
        setFullName('')
        setRole('user')
        setCredentials(null)
        setCredentialsCopied(false)
        setShowPassword(false)
        onOpenChange(false)
    }

    return (
        <Dialog open={open} onOpenChange={(val) => !val && handleClose()}>
            <DialogContent className="sm:max-w-[500px]">
                {!credentials ? (
                    // FORMULÁRIO DE CRIAÇÃO
                    <>
                        <DialogHeader>
                            <DialogTitle>Adicionar Funcionário</DialogTitle>
                            <DialogDescription>
                                Crie uma conta para um novo membro da equipe.
                            </DialogDescription>
                        </DialogHeader>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="fullName">Nome Completo</Label>
                                <Input
                                    id="fullName"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    placeholder="João Silva"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="joao@empresa.com"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="role">Papel</Label>
                                <Select value={role} onValueChange={(value: 'user' | 'admin') => setRole(value)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecione o papel" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="user">Usuário</SelectItem>
                                        <SelectItem value="admin">Administrador</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="password">Senha</Label>
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <Input
                                            id="password"
                                            type={showPassword ? 'text' : 'password'}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="Mínimo 8 caracteres"
                                            required
                                            minLength={8}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                        >
                                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={generatePassword}
                                    >
                                        Gerar
                                    </Button>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Use uma senha forte ou clique em "Gerar"
                                </p>
                            </div>

                            <div className="flex justify-end gap-3 pt-4">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={handleClose}
                                    disabled={isLoading}
                                >
                                    Cancelar
                                </Button>
                                <Button type="submit" disabled={isLoading}>
                                    {isLoading ? 'Criando...' : 'Criar Funcionário'}
                                </Button>
                            </div>
                        </form>
                    </>
                ) : (
                    // EXIBIÇÃO DE CREDENCIAIS (ONE-TIME)
                    <>
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 text-green-600">
                                <CheckCircle2 className="text-green-600" />
                                Funcionário Criado!
                            </DialogTitle>
                            <DialogDescription>
                                <span className="text-orange-600 font-semibold flex items-center gap-1 mt-1">
                                    <AlertCircle size={16} />
                                    Estas credenciais serão exibidas apenas uma vez!
                                </span>
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4 py-2">
                            <div className="space-y-3 rounded-lg border bg-muted/50 p-4 font-mono text-sm">
                                <div className="grid grid-cols-[60px_1fr] items-center gap-2">
                                    <span className="text-muted-foreground">Nome:</span>
                                    <span className="font-semibold">{credentials.full_name}</span>
                                </div>
                                <div className="grid grid-cols-[60px_1fr] items-center gap-2">
                                    <span className="text-muted-foreground">Email:</span>
                                    <span className="font-semibold">{credentials.email}</span>
                                </div>
                                <div className="grid grid-cols-[60px_1fr] items-center gap-2">
                                    <span className="text-muted-foreground">Senha:</span>
                                    <div className="font-semibold break-all bg-white dark:bg-black border rounded px-2 py-1">
                                        {credentials.temporary_password}
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col gap-2">
                                <Button
                                    onClick={copyCredentials}
                                    className="w-full"
                                    variant={credentialsCopied ? 'outline' : 'default'}
                                >
                                    {credentialsCopied ? (
                                        <>
                                            <CheckCircle2 className="mr-2" size={18} />
                                            Credenciais Copiadas
                                        </>
                                    ) : (
                                        <>
                                            <Copy className="mr-2" size={18} />
                                            Copiar Credenciais
                                        </>
                                    )}
                                </Button>

                                <p className="text-xs text-center text-muted-foreground">
                                    Certifique-se de ter copiado antes de fechar.
                                </p>
                            </div>

                            <div className="flex justify-end pt-2 border-t mt-2">
                                <Button onClick={handleClose} variant="ghost">
                                    Fechar
                                </Button>
                            </div>
                        </div>
                    </>
                )}
            </DialogContent>
        </Dialog>
    )
}
