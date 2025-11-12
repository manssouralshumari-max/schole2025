import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { BookOpen, Users, Award, Mail, Phone, MapPin, GraduationCap } from "lucide-react";
import heroImage from "@/assets/hero-school.jpg";

const Home = () => {
  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold text-primary">نظام المدارس الاهلية</span>
          </div>
          <div className="hidden md:flex items-center gap-6">
            <a href="#about" className="text-foreground hover:text-primary transition-colors">عن المدرسة</a>
            <a href="#programs" className="text-foreground hover:text-primary transition-colors">البرامج</a>
            <a href="#contact" className="text-foreground hover:text-primary transition-colors">للتواصل</a>
            <Link to="/login">
              <Button variant="hero">تسجيل الدخول</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative h-[600px] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <img src={heroImage} alt="School Campus" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-primary/90 to-accent/80" />
        </div>
        <div className="relative z-10 container mx-auto px-4 text-center text-primary-foreground">
          <h1 className="text-5xl md:text-6xl font-bold mb-6">مرحبا بك في نظام المدارس الاهلية</h1>
          <p className="text-xl md:text-2xl mb-8 max-w-2xl mx-auto">
            نحن نهدف لتعزيز الامتيازات التعليمية للطلاب من خلال التعلم المبتكر والتدريس المخصص
          </p>
          <div className="flex gap-4 justify-center">
            <Link to="/login">
              <Button variant="hero" size="lg">ابدء معنا الان</Button>
            </Link>
            <a href="#about">
              <Button variant="outline" size="lg" className="bg-background/10 border-primary-foreground text-primary-foreground hover:bg-background/20">
                لمعرفة المزيد
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-20 bg-secondary/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">عن المدرسة</h2>
            <p className="text-muted-foreground text-lg max-w-3xl mx-auto">
              نحن نهدف لتعزيز الامتيازات التعليمية للطلاب من خلال التعلم المبتكر والتدريس المخصص
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="bg-gradient-card border-primary/20">
              <CardHeader>
                <BookOpen className="h-12 w-12 text-primary mb-4" />
                <CardTitle>التعليم الجوهري</CardTitle>
                <CardDescription>
                  المنهج الدراسي المخصص لتعزيز التفكير المنطقي والإبداع
                </CardDescription>
              </CardHeader>
            </Card>
            <Card className="bg-gradient-card border-primary/20">
              <CardHeader>
                <Users className="h-12 w-12 text-accent mb-4" />
                <CardTitle>المدرسين الخبراء</CardTitle>
                <CardDescription>
                  مدرسين متخصصين بالتعليم والخبرة العلمية والتعليمية
                </CardDescription>
              </CardHeader>
            </Card>
            <Card className="bg-gradient-card border-primary/20">
              <CardHeader>
                <Award className="h-12 w-12 text-success mb-4" />
                <CardTitle>نتائج مؤكدة</CardTitle>
                <CardDescription>
                  سجل النجاح للطلاب في العلوم والرياضيات والفنون والترفيه
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Programs Section */}
      <section id="programs" className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">البرامج التعليمية</h2>
            <p className="text-muted-foreground text-lg">التعليم المتكامل من الابتدائي حتى الثانوي</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { title: "المرحلة الابتدائية", grades: "Grades 1-5", description: "Building strong foundations in core subjects" },
              { title: "المرحلة المتوسطة", grades: "Grades 6-8", description: "Developing critical thinking and independence" },
              { title: "المرحلة الثانوية ", grades: "Grades 9-12", description: "Preparing for college and career success" },
             
            ].map((program, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle>{program.title}</CardTitle>
                  <CardDescription className="text-primary font-semibold">{program.grades}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{program.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-20 bg-secondary/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">للتواصل</h2>
            <p className="text-muted-foreground text-lg">اتصل بنا للتسجيل والاستفسارات</p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-5xl mx-auto">
            <div className="space-y-6">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4 mb-4">
                    <MapPin className="h-6 w-6 text-primary" />
                    <div>
                      <h3 className="font-semibold">العنوان</h3>
                      <p className="text-muted-foreground">123 Education Street, Learning City, 12345</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 mb-4">
                    <Phone className="h-6 w-6 text-primary" />
                    <div>
                      <h3 className="font-semibold">Phone</h3>
                      <p className="text-muted-foreground">+1 (555) 123-4567</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Mail className="h-6 w-6 text-primary" />
                    <div>
                      <h3 className="font-semibold">Email</h3>
                      <p className="text-muted-foreground">info@excellenceacademy.edu</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            <Card>
              <CardHeader>
                <CardTitle>ارسل لنا رسالة</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input placeholder="Your Name" />
                <Input type="email" placeholder="Your Email" />
                <Textarea placeholder="Your Message" rows={5} />
                <Button variant="hero" className="w-full">ارسل الرسالة</Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-primary text-primary-foreground py-8">
        <div className="container mx-auto px-4 text-center">
          <p>&copy; 2025 Excellence Academy. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Home;
