import os
import json
from xml.etree.ElementTree import Element, SubElement, tostring
from xml.dom.minidom import parseString

# 定义博客的域名
baseUrl = "https://kb.dandanllab.top"  # 替换为你的博客域名
blog_title = "天天的小站"  # 替换为你的博客名称

def load_meta_data():
    meta_path = 'data/meta.json'
    if not os.path.exists(meta_path):
        raise FileNotFoundError(f"元数据文件 {meta_path} 不存在")
    
    with open(meta_path, 'r', encoding='utf-8') as f:
        meta_data = json.load(f)
    
    return meta_data

def load_all_posts(meta_data):
    all_posts = []
    data_files = meta_data.get('data_files', [])
    for file_name in data_files:
        file_path = os.path.join('data', file_name)
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"分页文件 {file_path} 不存在")
        
        with open(file_path, 'r', encoding='utf-8') as f:
            page_data = json.load(f)
            all_posts.extend(page_data.get('posts', []))
    
    return all_posts

def generate_sitemap():
    try:
        meta_data = load_meta_data()
        posts = load_all_posts(meta_data)

        urlset = Element('urlset', xmlns="http://www.sitemaps.org/schemas/sitemap/0.9")

        for post in posts:
            url = SubElement(urlset, 'url')
            loc = SubElement(url, 'loc')
            loc.text = f"{baseUrl}/?path={post['path']}"  # 使用博客域名和文章路径

            title_element = SubElement(url, 'title')
            title_element.text = f"{post.get('title', '')}-{blog_title}"

            category = SubElement(url, 'category')
            category.text = post.get('category', "")  # 如果缺少分类字段，设置为空字符串

            tags = SubElement(url, 'tags')
            tags.text = ', '.join(post.get('tags', [])) if post.get('tags') else ""  # 如果缺少标签字段，设置为空字符串

            archive = SubElement(url, 'archive')
            archive.text = post.get('archive', "")  # 如果缺少归档字段，设置为空字符串

            created = SubElement(url, 'created')
            created.text = post.get('created', "")  # 如果缺少创建时间字段，设置为空字符串

            modified = SubElement(url, 'modified')
            modified.text = post.get('modified', "")  # 如果缺少修改时间字段，设置为空字符串

        # 将 XML 转换为字符串并格式化
        xml_str = tostring(urlset, encoding='utf-8')
        pretty_xml = parseString(xml_str).toprettyxml(indent="    ", encoding='utf-8')

        # 写入文件
        sitemap_path = 'sitemap.xml'
        with open(sitemap_path, 'wb') as f:
            f.write(pretty_xml)

        print(f"站点地图生成成功，文件路径：{sitemap_path}")

    except FileNotFoundError as e:
        print(f"生成站点地图失败：{e}")
    except Exception as e:
        print(f"生成站点地图失败：{str(e)}")

if __name__ == '__main__':
    generate_sitemap()
