import { DemoInterview, Subtitle } from "./types";

// Helper to generate UUIDs
const generateId = () => Math.random().toString(36).substring(2, 11);

export const DEMO_INTERVIEWS: DemoInterview[] = [
  {
    id: "tech-interview",
    title: "Yapay Zeka ve Sinema Sektörü",
    speaker: "Aydın Karaca",
    topic: "Adobe Premiere Pro ve Yapay Zeka Entegrasyonları",
    audioUrl: "https://actions.google.com/sounds/v1/ambiences/morning_birds.ogg", // High quality fallback placeholder
    subtitles: [
      {
        id: "t1",
        start: 0.8,
        end: 4.5,
        text: "Merhaba, bugün Premiere Pro kullanan profesyonellerle bir röportaj serisindeyiz."
      },
      {
        id: "t2",
        start: 5.1,
        end: 9.8,
        text: "Özellikle yapay zeka araçlarının kurgu sürecini nasıl hızlandırdığını merak ediyoruz."
      },
      {
        id: "t3",
        start: 10.4,
        end: 14.2,
        text: "Bana kalırsa, eskiden saatlerimizi alan altyazı ve deşifre işleri artık saniyeler sürüyor."
      },
      {
        id: "t4",
        start: 14.8,
        end: 19.3,
        text: "Tabii ki Türkçe dilinde yazım kurallarına ve noktalamalara dikkat etmek çok önemli."
      },
      {
        id: "t5",
        start: 19.9,
        end: 25.1,
        text: "Çünkü bağlaç olan de da eklerinin veya soru eklerinin ayrı yazılması doğrudan kaliteyi etkiliyor."
      },
      {
        id: "t6",
        start: 25.8,
        end: 30.2,
        text: "Aynı zamanda altyazıların iki satırı aşmaması ve gözü yormaması gerekiyor."
      },
      {
        id: "t7",
        start: 30.9,
        end: 35.8,
        text: "İşte bu yüzden, iki altyazı arasındaki o milisaniyelik boşluğu bile hassas bir şekilde ayarlamalıyız."
      },
      {
        id: "t8",
        start: 36.5,
        end: 41.2,
        text: "Böylece Premiere Pro'ya aktardığımızda timeline üzerinde hiçbir çakışma yaşamıyoruz."
      }
    ]
  },
  {
    id: "street-interview",
    title: "Sokak Röportajı: Sosyal Medya",
    speaker: "Cem Yılmazer",
    topic: "Gençlerin Sosyal Medya ve Üretim Alışkanlıkları",
    audioUrl: "https://actions.google.com/sounds/v1/ambiences/coffee_shop_atmosphere.ogg",
    subtitles: [
      {
        id: "s1",
        start: 0.5,
        end: 3.2,
        text: "Bence sosyal medya artık hayatın tam merkezinde yer alıyor."
      },
      {
        id: "s2",
        start: 3.8,
        end: 7.9,
        text: "Günde en az üç dört saatimizi farklı platformlarda içerik tüketerek harcıyoruz."
      },
      {
        id: "s3",
        start: 8.5,
        end: 12.1,
        text: "Ama asıl önemli olan, sadece tüketici değil üretici de olabilmek."
      },
      {
        id: "s4",
        start: 12.6,
        end: 16.4,
        text: "Kendimize ait videoları kurgularken altyazı eklemek izlenme oranını artırıyor."
      },
      {
        id: "s5",
        start: 17.0,
        end: 21.8,
        text: "Çoğu insan metrolarda veya sessiz ortamlarda videoları sesi kapalı izliyor çünkü."
      },
      {
        id: "s6",
        start: 22.4,
        end: 26.5,
        text: "Bu durumda otomatik altyazıların kelime kelime doğruluğu devreye giriyor."
      },
      {
        id: "s7",
        start: 27.1,
        end: 31.9,
        text: "Doğru imla kuralları ve estetik altyazılar sayesinde kitlemizle bağımız güçleniyor."
      }
    ]
  },
  {
    id: "doc-narration",
    title: "Belgesel: Boğaziçi Mimarisi",
    speaker: "Aslı Gözüpek",
    topic: "İstanbul Yalılarının Tarihi ve Mimarisi",
    audioUrl: "https://actions.google.com/sounds/v1/ambiences/fire_in_fireplace.ogg",
    subtitles: [
      {
        id: "d1",
        start: 1.0,
        end: 6.2,
        text: "İstanbul Boğazı'nın iki yakasında sıralanan yalılar, Osmanlı mimarisinin en zarif örnekleridir."
      },
      {
        id: "d2",
        start: 6.9,
        end: 11.5,
        text: "Ahşabın suyla buluştuğu bu eşsiz yapılar, asırlardır tarihi olaylara tanıklık etmektedir."
      },
      {
        id: "d3",
        start: 12.2,
        end: 17.8,
        text: "Her birinin kendine has bir rengi, hikayesi ve Boğaz sularına yansıyan bir ruhu vardır."
      },
      {
        id: "d4",
        start: 18.5,
        end: 23.4,
        text: "Günümüzde bu yapıları korumak ve gelecek nesillere aktarmak en büyük sorumluluğumuzdur."
      },
      {
        id: "d5",
        start: 24.1,
        end: 29.8,
        text: "Onların zarafetini ve sessiz çığlığını dinlemek, İstanbul'u gerçekten hissetmek demektir."
      }
    ]
  }
];
