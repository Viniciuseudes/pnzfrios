import { X } from "lucide-react";

export function ClientModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card w-full max-w-2xl rounded-2xl shadow-2xl border border-border overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-secondary/40">
          <div>
            <h2 className="text-base font-semibold text-foreground">Cadastrar Cliente</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Preencha os dados do novo cliente</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto max-h-[70vh]">
          <div className="space-y-5">
            <div>
              <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-3">Dados Pessoais / Empresa</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { label: "Nome / Razão Social", placeholder: "Ex: Mercado Bom Preço Ltda", full: true },
                  { label: "CNPJ / CPF", placeholder: "00.000.000/0001-00" },
                  { label: "Telefone", placeholder: "(11) 99999-9999" },
                  { label: "E-mail", placeholder: "contato@empresa.com.br" },
                  { label: "Contato Responsável", placeholder: "Nome do comprador" },
                ].map(f => (
                  <div key={f.label} className={f.full ? "sm:col-span-2" : ""}>
                    <label className="block text-xs font-medium text-foreground mb-1">{f.label}</label>
                    <input placeholder={f.placeholder} className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition" />
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-3">Endereço de Entrega</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { label: "CEP", placeholder: "00000-000" },
                  { label: "Cidade / Estado", placeholder: "São Paulo, SP" },
                  { label: "Logradouro", placeholder: "Rua, Av., etc", full: true },
                  { label: "Número", placeholder: "123" },
                  { label: "Complemento", placeholder: "Galpão, Loja..." },
                  { label: "Bairro", placeholder: "Centro" },
                ].map(f => (
                  <div key={f.label} className={(f as any).full ? "sm:col-span-2" : ""}>
                    <label className="block text-xs font-medium text-foreground mb-1">{f.label}</label>
                    <input placeholder={f.placeholder} className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition" />
                  </div>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Observações</label>
              <textarea rows={3} placeholder="Condições especiais, horário de entrega, etc." className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition resize-none" />
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border bg-secondary/20">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted transition-colors">Cancelar</button>
          <button className="px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-[#163318] active:bg-[#0f2210] transition-colors shadow-sm">
            Salvar Cliente
          </button>
        </div>
      </div>
    </div>
  );
}
